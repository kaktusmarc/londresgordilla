/* =========================================================
   Londres en 3 días — lógica
   ========================================================= */
'use strict';

/* ---------- helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const WALK_KMH  = 4.6;   // paso urbano real, contando semáforos y gente
const DETOUR    = 1.32;  // línea recta -> calle, para el fallback
const TUBE_HINT = 2200;  // a partir de aquí sugerimos metro (metros)

function haversine(a, b){
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const la1 = a.lat * rad, la2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const walkSeconds = m => m / (WALK_KMH * 1000 / 3600);

function fmtDist(m){
  if (m < 950) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

function fmtDur(s){
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const gmapsUrl = s =>
  `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`;

/* ---------- caché en localStorage ---------- */
const NS  = 'londres3d:v2:';
const TTL = 1000 * 60 * 60 * 24 * 30; // 30 días

const store = {
  get(key){
    try{
      const raw = localStorage.getItem(NS + key);
      if (!raw) return null;
      const { t, v } = JSON.parse(raw);
      if (Date.now() - t > TTL){ localStorage.removeItem(NS + key); return null; }
      return v;
    }catch{ return null; }
  },
  set(key, v){
    try{ localStorage.setItem(NS + key, JSON.stringify({ t: Date.now(), v })); }catch{}
  }
};

/* =========================================================
   1. Rutas a pie
   ========================================================= */

/* El demo público de OSRM solo lleva el perfil de coche, así que
   probamos primero la instancia de OSM con perfil peatonal real y,
   si cae, usamos la distancia de calle del demo recalculando el
   tiempo a ritmo de paseo. Último recurso: línea recta. */
const ROUTERS = [
  { url: c => `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${c}?overview=full&geometries=geojson`, trustDuration: true  },
  { url: c => `https://router.project-osrm.org/route/v1/foot/${c}?overview=full&geometries=geojson`,             trustDuration: false }
];

async function fetchLeg(a, b){
  const key = `leg:${a.lat.toFixed(5)},${a.lng.toFixed(5)}>${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
  const hit = store.get(key);
  if (hit) return hit;

  const coords   = `${a.lng},${a.lat};${b.lng},${b.lat}`;
  const straight = haversine(a, b);

  for (const r of ROUTERS){
    try{
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(r.url(coords), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(res.status);

      const json = await res.json();
      if (json.code !== 'Ok' || !json.routes || !json.routes.length) throw new Error(json.code);

      const route = json.routes[0];

      // OSRM engancha cada punto a la calle más cercana. Si el enganche cae
      // lejos, o la ruta sale más corta que la línea recta, el resultado no
      // se corresponde con las paradas: mejor la estimación.
      const badSnap = (json.waypoints || []).some(w => (w.distance || 0) > 250);
      if (badSnap || route.distance < straight * 0.85) throw new Error('ruta poco fiable');

      const leg = {
        distance : route.distance,
        duration : r.trustDuration ? route.duration : walkSeconds(route.distance),
        estimated: false,
        line     : route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      };
      store.set(key, leg);
      return leg;
    }catch{ /* siguiente router */ }
  }

  // Fallback: haversine con factor de rodeo. No se cachea, para reintentar luego.
  const d = haversine(a, b) * DETOUR;
  return {
    distance : d,
    duration : walkSeconds(d),
    estimated: true,
    line     : [[a.lat, a.lng], [b.lat, b.lng]]
  };
}

/* =========================================================
   2. Fotos desde Wikipedia / Wikimedia
   ========================================================= */

const WIKI_API = 'https://en.wikipedia.org/w/api.php?origin=*&format=json&formatversion=2';

/* Miniatura al tamaño que queremos. Reescribir el "330px-" de la URL a mano
   da 404 en el host de thumbs, así que el tamaño se le pide a la API. */
async function wikiThumb(title, size = 640){
  try{
    const res = await fetch(`${WIKI_API}&action=query&redirects=1&prop=pageimages` +
                            `&piprop=thumbnail&pithumbsize=${size}&titles=${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const j = await res.json();
    const page = j.query && j.query.pages && j.query.pages[0];
    return (page && page.thumbnail && page.thumbnail.source) || null;
  }catch{ return null; }
}

/* Endpoint REST de resumen: segunda opción, la miniatura tal cual la da */
async function wikiSummary(title){
  try{
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`);
    if (!res.ok) return null;
    const j = await res.json();
    if (j.type && j.type.includes('disambiguation')) return null;
    return (j.thumbnail && j.thumbnail.source) || null;
  }catch{ return null; }
}

/* Último recurso: buscar el sitio por nombre y quedarse con el mejor resultado */
async function wikiSearch(term){
  try{
    const res = await fetch(`${WIKI_API}&action=query&prop=pageimages&piprop=thumbnail` +
                            `&pithumbsize=640&generator=search&gsrlimit=3` +
                            `&gsrsearch=${encodeURIComponent(term + ' London')}`);
    if (!res.ok) return null;
    const j = await res.json();
    const pages = (j.query && j.query.pages) || [];
    const found = [...pages]
      .sort((a, b) => (a.index || 99) - (b.index || 99))
      .find(p => p.thumbnail && p.thumbnail.source);
    return found ? found.thumbnail.source : null;
  }catch{ return null; }
}

async function fetchPhoto(stop){
  const key = 'pic:' + (stop.wiki || stop.name);
  const hit = store.get(key);
  if (hit !== null) return hit || null;   // false cacheado = sin foto

  let url = null;
  if (stop.wiki) url = await wikiThumb(stop.wiki);
  if (!url && stop.wiki) url = await wikiSummary(stop.wiki);
  if (!url)      url = await wikiSearch(stop.wiki || stop.name);

  store.set(key, url || false);
  return url;
}

/* Cola con concurrencia limitada, para no machacar la API */
function runQueue(items, worker, concurrency = 4){
  let i = 0;
  const next = () => {
    if (i >= items.length) return Promise.resolve();
    const item = items[i++];
    return Promise.resolve(worker(item)).catch(() => {}).then(next);
  };
  return Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

/* =========================================================
   3. Mapa
   ========================================================= */

const map = L.map('map', {
  zoomControl: false,
  attributionControl: true,
  scrollWheelZoom: true,
  tap: true
}).setView([51.5085, -0.128], 12);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Tiles estándar de OpenStreetMap: gratis y sin API key.
// Se desaturan por CSS (.leaflet-tile-pane) para que las rutas de color destaquen.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Marcador discreto del hotel, siempre visible
L.marker([TRIP.hotel.lat, TRIP.hotel.lng], {
  icon: L.divIcon({
    className: 'pin-wrap',
    html: '<div class="pin-hotel">\u{1F6CF}</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  }),
  zIndexOffset: -500,
  keyboard: false
}).addTo(map).bindPopup(
  `<div class="pop"><div class="pop__body">
     <div class="pop__name">${esc(TRIP.hotel.name)}</div>
     <div class="pop__blurb">Base de los tres días.</div>
     <a class="pop__link" href="${gmapsUrl(TRIP.hotel)}" target="_blank" rel="noopener">Abrir en Google Maps &rarr;</a>
   </div></div>`);

/* =========================================================
   4. Estado
   ========================================================= */

const state = {
  dayIndex : 0,
  activeStop: null,
  days     : TRIP.days.map(() => ({
    markers   : [],
    markerLayer: L.layerGroup(),
    routeLayer : L.layerGroup(),
    legLines  : [],
    legs      : [],
    bounds    : null,
    routed    : false,
    photographed: false
  }))
};

/* =========================================================
   5. Render
   ========================================================= */

const els = {
  tabs     : $('#tabs'),
  dayHead  : $('#dayHead'),
  timeline : $('#timeline'),
  mapReset : $('#mapReset'),
  hotelChip: $('#hotelChip'),
  dates    : $('#tripDates')
};

function buildChrome(){
  els.dates.textContent = TRIP.dates;
  els.hotelChip.href = gmapsUrl(TRIP.hotel);
  $('.hotel-chip__text', els.hotelChip).textContent = TRIP.hotel.short;

  els.tabs.innerHTML = TRIP.days.map((d, i) => `
    <button class="tab" role="tab" type="button"
            id="tab-${d.id}" aria-selected="${i === 0}" data-day="${i}"
            style="--c:${d.color}">
      <span class="tab__n">${esc(d.tab)}</span>
      <span class="tab__sub">${esc(d.theme)}</span>
    </button>`).join('');

  els.tabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (btn) selectDay(Number(btn.dataset.day));
  });

  els.mapReset.addEventListener('click', () => {
    clearSelection();
    fitDay();
  });
}

function legIcon(){
  return `<svg class="leg__icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="13" cy="4" r="1.6"/>
    <path d="M11.5 21l1.3-5.2-2.8-2.6.8-4.4 3.2 1.9 2.5.6M10.8 8.8L8 10.3 6.8 13.4M8.7 21l2.1-3.6"/>
  </svg>`;
}

function stopMarkup(stop, i, day){
  const n = i + 1;
  const photoKey = `${day.id}-${i}`;
  return `
  <li class="stop" data-stop="${i}" id="stop-${day.id}-${i}">
    <span class="stop__dot" aria-hidden="true">${stop.icon ? stop.icon : n}</span>
    <button class="stop__card" type="button" data-stop-btn="${i}"
            aria-label="Ver ${esc(stop.name)} en el mapa">
      <div class="stop__body">
        <div class="stop__meta">
          <span class="stop__time">${esc(stop.time)}</span>
          ${stop.tag ? `<span class="stop__tag">${esc(stop.tag)}</span>` : ''}
        </div>
        <h3 class="stop__name">${esc(stop.name)}</h3>
        <p class="stop__blurb">${esc(stop.blurb)}</p>
        ${stop.fix ? `<span class="stop__fix">Coordenada corregida: ${esc(stop.fix)}</span>` : ''}
        <div class="stop__actions">
          <span class="gmaps" data-gmaps="${esc(gmapsUrl(stop))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
            Google Maps
          </span>
        </div>
      </div>
      <figure class="photo is-loading" data-photo="${photoKey}">
        <figcaption class="photo__ph">${esc(stop.name)}</figcaption>
      </figure>
    </button>
  </li>`;
}

function legMarkup(day, i){
  return `
  <li class="leg is-pending" data-leg="${day.id}-${i}" aria-live="polite">
    <span class="leg__inner">
      ${legIcon()}
      <span class="leg__val">calculando…</span>
    </span>
  </li>`;
}

function renderDay(){
  const day = TRIP.days[state.dayIndex];

  document.documentElement.style.setProperty('--day', day.color);
  document.documentElement.style.setProperty('--day-tint', day.tint);

  $$('.tab', els.tabs).forEach((t, i) =>
    t.setAttribute('aria-selected', String(i === state.dayIndex)));

  els.dayHead.innerHTML = `
    <h2 class="day-head__label">${esc(day.label)}<br><span class="day-head__theme">${esc(day.theme)}</span></h2>
    <div class="day-head__stats">
      <div class="stat"><span class="stat__v">${day.stops.length}</span><span class="stat__k">Paradas</span></div>
      <div class="stat"><span class="stat__v is-loading" data-total-dist>—</span><span class="stat__k">A pie</span></div>
      <div class="stat"><span class="stat__v is-loading" data-total-time>—</span><span class="stat__k">Caminando</span></div>
      <div class="stat"><span class="stat__v">${esc(day.stops[0].time)}–${esc(day.stops[day.stops.length - 1].time)}</span><span class="stat__k">Horario</span></div>
    </div>`;

  els.timeline.innerHTML = day.stops.map((s, i) =>
    stopMarkup(s, i, day) + (i < day.stops.length - 1 ? legMarkup(day, i) : '')
  ).join('');

  buildMarkers(state.dayIndex);
  showDayLayers(state.dayIndex);
  fitDay();

  resolveRoutes(state.dayIndex);
  loadPhotos(state.dayIndex);
}

/* ---------- marcadores ---------- */
function buildMarkers(di){
  const st = state.days[di];
  if (st.markers.length) return;           // ya construidos

  const day = TRIP.days[di];
  const pts = [];

  day.stops.forEach((stop, i) => {
    const marker = L.marker([stop.lat, stop.lng], {
      icon: L.divIcon({
        className: 'pin-wrap',
        html: `<div class="pin" style="--c:${day.color}"><span>${stop.icon ? stop.icon : i + 1}</span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      }),
      riseOnHover: true,
      title: `${stop.time} · ${stop.name}`
    });

    marker.bindPopup(popupHtml(stop, day), { offset: [0, -10], closeButton: true, maxWidth: 230, autoPanPadding: [14, 14] });
    marker.on('click', () => selectStop(i, 'map'));

    st.markers.push(marker);
    st.markerLayer.addLayer(marker);
    pts.push([stop.lat, stop.lng]);

    // línea recta provisional mientras llega la ruta real
    if (i > 0){
      const prev = day.stops[i - 1];
      const line = L.polyline([[prev.lat, prev.lng], [stop.lat, stop.lng]], {
        color: day.color, weight: 3, opacity: .35, dashArray: '2 7', lineCap: 'round'
      });
      st.legLines[i - 1] = line;
      st.routeLayer.addLayer(line);
    }
  });

  st.bounds = L.latLngBounds(pts);
}

/* Ojo: Leaflet regenera el contenido del popup desde este string cada vez
   que llama a update(), así que la foto se mete aquí (vía stop._photo) y
   no inyectándola en el DOM del popup ya abierto. */
function popupHtml(stop, day){
  return `
  <div class="pop" style="--c:${day.color}">
    ${stop._photo ? `<img class="pop__img" src="${esc(stop._photo)}" alt="${esc(stop.name)}">` : ''}
    <div class="pop__body">
      <div class="pop__time">${esc(stop.time)}</div>
      <div class="pop__name">${esc(stop.name)}</div>
      <div class="pop__blurb">${esc(stop.blurb)}</div>
      <a class="pop__link" href="${gmapsUrl(stop)}" target="_blank" rel="noopener">Abrir en Google Maps &rarr;</a>
    </div>
  </div>`;
}

/* Refresca el popup de una parada si su foto ha llegado después */
function refreshPopup(di, i){
  const marker = state.days[di].markers[i];
  if (!marker) return;
  marker.setPopupContent(popupHtml(TRIP.days[di].stops[i], TRIP.days[di]));
}

function showDayLayers(di){
  state.days.forEach((st, i) => {
    if (i === di){
      st.markerLayer.addTo(map);
      st.routeLayer.addTo(map);
    }else{
      map.removeLayer(st.markerLayer);
      map.removeLayer(st.routeLayer);
    }
  });
}

function fitDay(){
  const st = state.days[state.dayIndex];
  if (!st.bounds) return;
  map.fitBounds(st.bounds, { padding: [42, 42], maxZoom: 15, animate: true });
  els.mapReset.classList.remove('is-shown');
}

/* ---------- selección ---------- */
function selectStop(i, source){
  const st = state.days[state.dayIndex];
  const stop = TRIP.days[state.dayIndex].stops[i];

  state.activeStop = i;

  $$('.stop', els.timeline).forEach(li =>
    li.classList.toggle('is-active', Number(li.dataset.stop) === i));

  st.markers.forEach((m, k) => {
    const el = m.getElement();
    if (el) el.classList.toggle('is-active', k === i);
  });

  // El popup se abre hacia arriba: desplazamos el centro para que el marcador
  // quede en la mitad baja del mapa y la ficha no se salga por el borde.
  const zoom = Math.max(map.getZoom(), 16);
  const pt   = map.project([stop.lat, stop.lng], zoom);
  const drop = map.getSize().y * 0.23;
  const centre = map.unproject(pt.subtract([0, drop]), zoom);

  map.flyTo(centre, zoom, { duration: .7 });
  map.once('moveend', () => st.markers[i].openPopup());
  st.markers[i].openPopup();
  els.mapReset.classList.add('is-shown');

  if (source === 'map'){
    const li = $(`#stop-${TRIP.days[state.dayIndex].id}-${i}`);
    if (li) li.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clearSelection(){
  state.activeStop = null;
  $$('.stop', els.timeline).forEach(li => li.classList.remove('is-active'));
  state.days[state.dayIndex].markers.forEach(m => {
    const el = m.getElement();
    if (el) el.classList.remove('is-active');
  });
  map.closePopup();
}

function selectDay(di){
  if (di === state.dayIndex) return;
  state.dayIndex = di;
  state.activeStop = null;
  map.closePopup();
  renderDay();
  $('.list-pane').scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================================================
   6. Resolución de rutas (progresiva)
   ========================================================= */

async function resolveRoutes(di){
  const st  = state.days[di];
  const day = TRIP.days[di];

  // Al volver a un día ya calculado la lista se ha regenerado en blanco:
  // hay que repintar los tramos desde lo que ya teníamos.
  // Ya resuelto, o resolviéndose desde una visita anterior a este día:
  // repintamos lo que haya (la lista se regenera vacía en cada render) y
  // dejamos que el bucle en curso, si lo hay, siga pintando sobre ella.
  if (st.routed || st.routing){
    st.legs.forEach((leg, i) => leg && paintLeg(day, i, leg));
    paintTotals(di);
    return;
  }

  st.routing = true;

  for (let i = 0; i < day.stops.length - 1; i++){
    const leg = await fetchLeg(day.stops[i], day.stops[i + 1]);
    st.legs[i] = leg;

    // dibuja la ruta real sustituyendo la recta provisional
    const old = st.legLines[i];
    if (old) st.routeLayer.removeLayer(old);
    const line = L.polyline(leg.line, {
      color: day.color,
      weight: leg.estimated ? 3 : 4.5,
      opacity: leg.estimated ? .4 : .78,
      dashArray: leg.estimated ? '3 8' : null,
      lineCap: 'round',
      lineJoin: 'round'
    });
    st.legLines[i] = line;
    st.routeLayer.addLayer(line);

    paintLeg(day, i, leg);
    paintTotals(di);
  }

  st.routing = false;
  st.routed  = true;
}

function paintLeg(day, i, leg){
  const el = $(`[data-leg="${day.id}-${i}"]`);
  if (!el) return;
  el.classList.remove('is-pending');
  el.innerHTML = `
    <span class="leg__inner">
      ${legIcon()}
      <span class="leg__val">${fmtDur(leg.duration)}</span>
      <span class="leg__sep">·</span>
      <span>${fmtDist(leg.distance)}</span>
      ${leg.estimated ? '<span class="leg__badge">estimado</span>' : ''}
      ${leg.distance > TUBE_HINT ? '<span class="leg__badge leg__badge--tube">mejor en metro</span>' : ''}
    </span>`;
}

function paintTotals(di){
  const st = state.days[di];
  if (di !== state.dayIndex) return;

  const legs = st.legs.filter(Boolean);
  const dist = legs.reduce((a, l) => a + l.distance, 0);
  const time = legs.reduce((a, l) => a + l.duration, 0);
  const done = legs.length === TRIP.days[di].stops.length - 1;

  const dEl = $('[data-total-dist]');
  const tEl = $('[data-total-time]');
  if (!dEl || !tEl) return;

  dEl.textContent = fmtDist(dist);
  tEl.textContent = fmtDur(time);
  dEl.classList.toggle('is-loading', !done);
  tEl.classList.toggle('is-loading', !done);
}

/* =========================================================
   7. Fotos (progresivo, día activo)
   ========================================================= */

async function loadPhotos(di){
  const st  = state.days[di];
  const day = TRIP.days[di];

  await runQueue(day.stops.map((s, i) => ({ s, i })), async ({ s, i }) => {
    const url = await fetchPhoto(s);
    s._photo = url || null;
    refreshPopup(di, i);

    const fig = $(`[data-photo="${day.id}-${i}"]`);
    if (fig){
      fig.classList.remove('is-loading');
      if (url){
        // Sin loading="lazy": la imagen aún no está en el DOM y el navegador
        // difiere la carga indefinidamente, así que 'load' no llegaría nunca.
        const img = new Image();
        img.alt = s.name;
        img.decoding = 'async';
        // listeners antes que src, para no perder el evento
        img.addEventListener('load', () => {
          fig.innerHTML = '';
          fig.appendChild(img);
        });
        img.addEventListener('error', () => { /* se queda el placeholder */ });
        img.src = url;
      }
    }
  }, 4);

  st.photographed = true;
}

/* =========================================================
   8. Eventos de la lista
   ========================================================= */

els.timeline.addEventListener('click', e => {
  const gm = e.target.closest('[data-gmaps]');
  if (gm){
    e.stopPropagation();
    window.open(gm.dataset.gmaps, '_blank', 'noopener');
    return;
  }
  const btn = e.target.closest('[data-stop-btn]');
  if (btn) selectStop(Number(btn.dataset.stopBtn), 'list');
});

/* =========================================================
   9. Redimensionado
   ========================================================= */

window.addEventListener('resize', () => map.invalidateSize());
window.addEventListener('orientationchange', () => setTimeout(() => map.invalidateSize(), 250));

/* =========================================================
   Arranque
   ========================================================= */

buildChrome();
renderDay();
setTimeout(() => map.invalidateSize(), 60);
