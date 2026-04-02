'use strict';

const LABEL_COLORS = { SOLAR: '#ffa726', WIND: '#7b1fa2', BIOMASS: '#43a047', HYBRID: '#0288d1' };
const LABEL_ICONS  = { SOLAR: '☀️', WIND: '💨', BIOMASS: '🌿', HYBRID: '⚡' };

const SUITABILITY_COLORS = [
  { t: 0.80, c: '#1a9641' }, { t: 0.70, c: '#78c679' }, { t: 0.55, c: '#d0e048' },
  { t: 0.40, c: '#fd8d3c' }, { t: 0.00, c: '#d7191c' },
];

const CONSTRAINT_VIEW_COLORS = [
  { t: 0.80, c: '#d7191c' }, { t: 0.50, c: '#fd8d3c' }, { t: 0.20, c: '#ffffbf' }, { t: 0.00, c: '#1a9641' },
];

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const TILE_OPT = { attribution: '© OSM © CARTO', subdomains: 'abcd', maxZoom: 19 };

const state = {
  activeView: 'map', mapView: 'block', energy: 'optimal',
  districtFilter: 'all', labelFilter: 'all', showConstraints: false,
  blockDataMap: {}, districtMap: {}, blockGeoJSON: null, districtGeoJSON: null,
  _geoBlockKey: null, _geoDistKey: null,
  predDistMode: 'block', scatterFeature: 'solar_mean', splitInited: false,
  bounds: { solar: {min:999,max:0}, wind: {min:999,max:0}, biomass: {min:999,max:0} }
};

const BLOCK_CANDIDATES = ['block_name','BLOCK_NAME','Block_Name','blockname','BLOCKNAME','block','BLOCK','Block','blk_name','name','NAME','tahsil','TAHSIL'];
const DIST_CANDIDATES  = ['district_n','district','DISTRICT','District','dist_name','DIST_NAME','district_name','DISTRICT_NAME','DistrictName','dname','DNAME','dtname','DTNAME','zilla','ZILLA'];

function scanGeoJSONProps(geojson) {
  const sample = geojson.features.slice(0, 100);
  const allKeys = new Set();
  sample.forEach(f => Object.keys(f.properties || {}).forEach(k => allKeys.add(k)));
  let blockKey = BLOCK_CANDIDATES.find(k => allKeys.has(k)) || [...allKeys].find(k => /block|blk|tahsil/i.test(k)) || null;
  let distKey = DIST_CANDIDATES.find(k => allKeys.has(k)) || [...allKeys].find(k => /^dist(?!_roads|_trans|_sub|ance)|zilla/i.test(k)) || null;
  return { blockKey, distKey };
}

function getBlockName(props) {
  if (!props) return '';
  if (state._geoBlockKey && props[state._geoBlockKey] != null) return String(props[state._geoBlockKey]).trim();
  for (const k of BLOCK_CANDIDATES) if (props[k] != null) return String(props[k]).trim();
  return '';
}

function getDistNameFromDistGeoJSON(props) {
  if (!props) return '';
  const keys = ['district_n','district','DISTRICT','District','dist_name','DIST_NAME','name','NAME','Name','district_name'];
  for (const k of keys) if (props[k] != null) return String(props[k]).trim();
  return '';
}

function suitabilityColor(score) {
  for (const { t, c } of SUITABILITY_COLORS) if (score >= t) return c;
  return SUITABILITY_COLORS[SUITABILITY_COLORS.length - 1].c;
}
function constraintColor(pct) {
  const f = pct / 100;
  for (const { t, c } of CONSTRAINT_VIEW_COLORS) if (f >= t) return c;
  return CONSTRAINT_VIEW_COLORS[CONSTRAINT_VIEW_COLORS.length - 1].c;
}

// Dynamically scale feature heatmaps for sub-layers
function getFeatureNorm(val, type) {
  const b = state.bounds[type];
  if (b.max === b.min) return 0;
  return Math.max(0, Math.min(1, (val - b.min) / (b.max - b.min)));
}

function blockFillColor(row, energy) {
  if (energy === 'optimal') return LABEL_COLORS[row._label] || '#3a4560';
  if (energy === 'constraints') return constraintColor(parseFloat(row.constraint_pct) || 0);
  if (energy === 'solar') return suitabilityColor(getFeatureNorm(parseFloat(row.solar_mean)||0, 'solar'));
  if (energy === 'wind')  return suitabilityColor(getFeatureNorm(parseFloat(row.wind_mean)||0, 'wind'));
  if (energy === 'biomass') return suitabilityColor(1 - getFeatureNorm(parseFloat(row.pop_mean)||0, 'biomass'));
  return suitabilityColor(row._conf);
}

function blockLeafletStyle(row, energy) {
  return { fillColor: blockFillColor(row, energy), fillOpacity: 0.78, color: '#1c2333', weight: 0.8 };
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const vals = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row;
  }).filter(Boolean);
}

function buildBlockDataMap(csvRows) {
  const NUMERIC = ['solar_mean','wind_mean','dist_roads_mean','dist_trans_mean','dist_sub_mean','constraint_pct','pop_mean','rf_confidence'];
  const grouped = {};

  csvRows.forEach(row => {
    const key = (row.block_name || '').trim().toLowerCase();
    if (!key) return;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });

  const bdm = {};
  Object.entries(grouped).forEach(([key, rows]) => {
    let r = rows.length === 1 ? { ...rows[0] } : {};
    if (rows.length > 1) {
      NUMERIC.forEach(col => r[col] = rows.reduce((s, x) => s + (parseFloat(x[col]) || 0), 0) / rows.length);
      r.block_name = rows[0].block_name;
      r.final_prediction = rows[0].final_prediction;
      r.rf_prediction = rows[0].rf_prediction;
      r.district = rows[0].district;
    }

    // PURE ML DATA EXTRACTION
    r._label = (r.final_prediction || r.rf_prediction || 'SOLAR').trim().toUpperCase();
    r._conf = parseFloat(r.rf_confidence) || 0;
    r._district = (r.district || '').trim();
    
    // Bounds tracking for heatmaps
    const s = parseFloat(r.solar_mean)||0, w = parseFloat(r.wind_mean)||0, p = parseFloat(r.pop_mean)||0;
    if(s < state.bounds.solar.min) state.bounds.solar.min = s; if(s > state.bounds.solar.max) state.bounds.solar.max = s;
    if(w < state.bounds.wind.min) state.bounds.wind.min = w; if(w > state.bounds.wind.max) state.bounds.wind.max = w;
    if(p < state.bounds.biomass.min) state.bounds.biomass.min = p; if(p > state.bounds.biomass.max) state.bounds.biomass.max = p;

    bdm[key] = r;
  });
  return bdm;
}

function modeLabelOf(rows) {
  const counts = {};
  rows.forEach(r => { counts[r._label] = (counts[r._label] || 0) + 1; });
  return Object.entries(counts).sort(([,a],[,b]) => b-a)[0]?.[0] || 'SOLAR';
}

function buildDistrictMap(blockGeoJSON, blockDataMap) {
  const grouped = {};

  Object.values(blockDataMap).forEach(csvRow => {
    const dist = csvRow._district;
    if (!dist || dist === 'Unknown') return;
    if (!grouped[dist]) grouped[dist] = { rows: [], blockCount: 0 };
    grouped[dist].rows.push(csvRow);
    grouped[dist].blockCount++;
  });

  const distMap = {};
  Object.entries(grouped).forEach(([dist, { rows, blockCount }]) => {
    const agg = { district: dist, blockCount };
    agg._conf = rows.reduce((s, r) => s + r._conf, 0) / rows.length;
    agg.constraint_pct = rows.reduce((s, r) => s + (parseFloat(r.constraint_pct)||0), 0) / rows.length;
    
    const lc = { SOLAR: 0, WIND: 0, BIOMASS: 0, HYBRID: 0 };
    rows.forEach(r => { if(lc[r._label] !== undefined) lc[r._label]++; });
    
    agg._labelCounts = lc;
    agg._label = modeLabelOf(rows);
    agg._agreeCount = rows.filter(r => r._label === agg._label).length;
    agg._agrees = (agg._agreeCount / blockCount) >= 0.5;
    distMap[dist] = agg;
  });
  return distMap;
}

const map = L.map('map', { center: [20.5, 84.5], zoom: 7, zoomControl: true });
L.tileLayer(TILE_URL, TILE_OPT).addTo(map);

let mainLayer = null, constraintLayer = null, mapDist = null, mapBlock = null;
let splitLayerDist = null, splitLayerBlock = null;

function buildHoverTooltip(blockName, distName, row) {
  const color = LABEL_COLORS[row._label] || '#aaa', icon = LABEL_ICONS[row._label] || '';
  return `
    <div class="tt-name">${blockName}</div>
    <div class="tt-district">${distName || '—'}</div>
    <div class="tt-label" style="color:${color}">${icon} ${row._label} &nbsp;${(row._conf * 100).toFixed(1)}%</div>
    <div class="tt-constraint">Constraint: ${parseFloat(row.constraint_pct).toFixed(1)}%</div>
  `;
}

function buildBlockPopup(name, dist, row) {
  const scoreColor = suitabilityColor(row._conf), pct = (row._conf * 100).toFixed(1);
  const lColor = LABEL_COLORS[row._label] || '#aaa';
  return `
    <div class="map-popup">
      <div class="popup-title">${name}</div><div class="popup-district">${dist}</div>
      <div class="popup-label-pill" style="background:${lColor}22;color:${lColor};border:1px solid ${lColor}55">
        ${LABEL_ICONS[row._label]} ${row._label}
      </div>
      <div class="popup-ml-label">Random Forest Confidence</div>
      <div class="popup-ml-score" style="color:${scoreColor}">${pct}%</div>
      <div class="popup-score-bar"><div class="popup-score-fill" style="width:${pct}%;background:${scoreColor}"></div></div>
      <div class="popup-grid">
        <span class="pk">Solar Mean</span><span class="pv">${parseFloat(row.solar_mean).toFixed(3)}</span>
        <span class="pk">Wind Mean</span><span class="pv">${parseFloat(row.wind_mean).toFixed(3)}</span>
        <span class="pk">Constraint</span><span class="pv">${parseFloat(row.constraint_pct).toFixed(1)}%</span>
        <span class="pk">Dist. Roads</span><span class="pv">${parseFloat(row.dist_roads_mean).toFixed(2)}</span>
      </div>
    </div>`;
}

function buildDistrictPopup(name, agg) {
  const pct = (agg._conf * 100).toFixed(1), scoreColor = suitabilityColor(agg._conf);
  const lColor = LABEL_COLORS[agg._label] || '#aaa';
  return `
    <div class="map-popup">
      <div class="popup-title">${name}</div><div class="popup-district">${agg.blockCount} blocks</div>
      <div class="popup-label-pill" style="background:${lColor}22;color:${lColor};border:1px solid ${lColor}55">
        ${LABEL_ICONS[agg._label]} Dominant: ${agg._label}
      </div>
      <div class="popup-ml-label">Avg RF Confidence</div>
      <div class="popup-ml-score" style="color:${scoreColor}">${pct}%</div>
      <div class="popup-score-bar"><div class="popup-score-fill" style="width:${pct}%;background:${scoreColor}"></div></div>
      <div class="popup-grid">
        <span class="pk">Solar blocks</span><span class="pv">${agg._labelCounts.SOLAR || 0}</span>
        <span class="pk">Wind blocks</span><span class="pv">${agg._labelCounts.WIND || 0}</span>
        <span class="pk">Biomass blocks</span><span class="pv">${agg._labelCounts.BIOMASS || 0}</span>
        <span class="pk">Agreement</span><span class="pv">${agg._agreeCount}/${agg.blockCount}</span>
      </div>
    </div>`;
}

function clearMainLayer() { if (mainLayer) { map.removeLayer(mainLayer); mainLayer = null; } }
function clearConstraintLayer() { if (constraintLayer) { map.removeLayer(constraintLayer); constraintLayer = null; } }

function renderBlockLayer() {
  clearMainLayer();
  const { blockDataMap, blockGeoJSON, districtFilter, labelFilter, energy } = state;
  const fd = districtFilter === 'all' ? null : districtFilter.toLowerCase();
  const fl = labelFilter === 'all' ? null : labelFilter;
  
  const filtered = {
    type: 'FeatureCollection',
    features: (blockGeoJSON?.features || []).filter(feat => {
      const props = feat.properties || {};
      const row  = blockDataMap[getBlockName(props).toLowerCase()];
      if (!row) return false;
      if (fd && (row._district || '').toLowerCase() !== fd) return false;
      if (fl && row._label !== fl) return false;
      return true;
    })
  };

  mainLayer = L.geoJSON(filtered, {
    style: feat => {
      const row = blockDataMap[getBlockName(feat.properties || {}).toLowerCase()];
      return row ? blockLeafletStyle(row, energy) : { fillColor: '#3a4560', fillOpacity: 0.3, color: '#2a3448', weight: 0.5 };
    },
    onEachFeature: (feat, layer) => {
      const props = feat.properties || {}, rawName = getBlockName(props) || 'Unknown';
      const row = blockDataMap[rawName.toLowerCase()];
      if (!row) return;
      const dist = row._district || 'Unknown';
      layer.bindTooltip(buildHoverTooltip(rawName, dist, row), { className: 'dss-tooltip', sticky: true, opacity: 1 });
      layer.on({
        mouseover(e) { e.target.setStyle({ weight: 2, color: '#4fc3f7', fillOpacity: 0.92 }); e.target.bringToFront(); },
        mouseout(e)  { if (mainLayer) mainLayer.resetStyle(e.target); },
        click()      { layer.bindPopup(buildBlockPopup(rawName, dist, row)).openPopup(); showBlockInfoPanel(rawName, dist, row); },
      });
    }
  }).addTo(map);

  if (state.showConstraints) renderConstraintLayer();
}

function renderDistrictLayer() {
  clearMainLayer();
  if (!state.districtGeoJSON) return;
  mainLayer = L.geoJSON(state.districtGeoJSON, {
    style: feat => {
      const agg = state.districtMap[getDistNameFromDistGeoJSON(feat.properties || '')];
      if (!agg) return { fillColor: '#3a4560', fillOpacity: 0.25, color: '#2a3448', weight: 1 };
      const fillColor = state.energy === 'optimal' ? (LABEL_COLORS[agg._label] || '#3a4560') :
        state.energy === 'constraints' ? constraintColor(agg.constraint_pct) : suitabilityColor(agg._conf);
      return { fillColor, fillOpacity: 0.72, color: '#1c2333', weight: 1.2 };
    },
    onEachFeature: (feat, layer) => {
      const name = getDistNameFromDistGeoJSON(feat.properties || '') || 'Unknown', agg = state.districtMap[name];
      if (!agg) return;
      const lColor = LABEL_COLORS[agg._label] || '#aaa';
      layer.bindTooltip(`
        <div class="tt-name">${name}</div><div class="tt-district">${agg.blockCount} blocks</div>
        <div class="tt-label" style="color:${lColor}">${LABEL_ICONS[agg._label]} ${agg._label}</div>
      `, { className: 'dss-tooltip', sticky: true, opacity: 1 });
      layer.on({
        mouseover(e) { e.target.setStyle({ weight: 2.5, color: '#4fc3f7', fillOpacity: 0.9 }); e.target.bringToFront(); },
        mouseout(e)  { if (mainLayer) mainLayer.resetStyle(e.target); },
        click()      { layer.bindPopup(buildDistrictPopup(name, agg)).openPopup(); },
      });
    }
  }).addTo(map);
}

function renderConstraintLayer() {
  clearConstraintLayer();
  if (!state.blockGeoJSON) return;
  const fc = {
    type: 'FeatureCollection',
    features: state.blockGeoJSON.features.filter(feat => {
      const r = state.blockDataMap[getBlockName(feat.properties || {}).toLowerCase()];
      return r && parseFloat(r.constraint_pct) > 80;
    })
  };
  constraintLayer = L.geoJSON(fc, { style: { fillColor: '#ff1744', fillOpacity: 0.35, color: '#ff1744', weight: 1, dashArray: '4,4' }, interactive: false }).addTo(map);
}

function rerender() {
  clearConstraintLayer();
  state.mapView === 'block' ? renderBlockLayer() : renderDistrictLayer();
  if (state.showConstraints && state.mapView === 'block') renderConstraintLayer();
  updateStatusBar(); updateBottomCharts();
}

function initSplitMaps() {
  if (state.splitInited) return;
  state.splitInited = true;
  mapDist = L.map('map-district', { center: map.getCenter(), zoom: map.getZoom(), zoomControl: true });
  mapBlock = L.map('map-block', { center: map.getCenter(), zoom: map.getZoom(), zoomControl: false });
  L.tileLayer(TILE_URL, TILE_OPT).addTo(mapDist); L.tileLayer(TILE_URL, TILE_OPT).addTo(mapBlock);

  let syncing = false;
  function sync(s, t) { s.on('moveend', () => { if (!syncing) { syncing = true; t.setView(s.getCenter(), s.getZoom(), { animate: false }); syncing = false; }}); }
  sync(mapDist, mapBlock); sync(mapBlock, mapDist);
}

function activateSplitView() {
  initSplitMaps();
  mapDist.setView(map.getCenter(), map.getZoom()); mapBlock.setView(map.getCenter(), map.getZoom());
  setTimeout(() => {
    mapDist.invalidateSize(); mapBlock.invalidateSize();
    
    if (splitLayerDist) mapDist.removeLayer(splitLayerDist);
    splitLayerDist = L.geoJSON(state.districtGeoJSON, {
      style: f => {
        const agg = state.districtMap[getDistNameFromDistGeoJSON(f.properties||'')];
        return { fillColor: agg ? (LABEL_COLORS[agg._label] || '#3a4560') : '#3a4560', fillOpacity: 0.75, color: '#1c2333', weight: 1.2 };
      }
    }).addTo(mapDist);

    if (splitLayerBlock) mapBlock.removeLayer(splitLayerBlock);
    splitLayerBlock = L.geoJSON(state.blockGeoJSON, {
      style: f => {
        const r = state.blockDataMap[getBlockName(f.properties||{}).toLowerCase()];
        return { fillColor: r ? (LABEL_COLORS[r._label] || '#3a4560') : '#3a4560', fillOpacity: 0.78, color: '#1c2333', weight: 0.8 };
      }
    }).addTo(mapBlock);

    const container = document.getElementById('agr-squares');
    container.innerHTML = '';
    Object.entries(state.districtMap).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, agg]) => {
      const sq = document.createElement('div');
      sq.className = `agr-sq ${agg._agrees ? 'agree' : 'disagree'}`;
      sq.title = `${name}: ${agg._agreeCount}/${agg.blockCount} blocks agree (${agg._label})`;
      container.appendChild(sq);
    });
  }, 50);
}

function updateStatusBar() {
  let rows = Object.values(state.blockDataMap);
  if (state.districtFilter !== 'all') rows = rows.filter(r => (r._district || '').toLowerCase() === state.districtFilter.toLowerCase());
  if (state.labelFilter !== 'all') rows = rows.filter(r => r._label === state.labelFilter);

  const c = { SOLAR: 0, WIND: 0, BIOMASS: 0, HYBRID: 0, high: 0 };
  rows.forEach(r => { 
    if (c[r._label] !== undefined) c[r._label]++; 
    if (r._conf >= 0.80) c.high++; 
  });

  ['solar','wind','biomass','hybrid'].forEach(k => document.getElementById(`sb-${k}`).textContent = c[k.toUpperCase()]);
  document.getElementById('sb-highconf').textContent = `${c.high} (${rows.length ? ((c.high/rows.length)*100).toFixed(1) : 0}%)`;
  document.getElementById('sb-showing').textContent = rows.length;
  document.getElementById('sb-scale').textContent = state.mapView === 'district' ? 'District' : 'Block';
}

function populateDistrictFilter() {
  const sel = document.getElementById('district-filter');
  Object.keys(state.districtMap).sort().forEach(d => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = d; sel.appendChild(opt);
  });
}

let chartTopBlocks = null, chartDistricts = null;

function initBottomCharts() {
  const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const grid = { color: 'rgba(42,52,72,0.8)', borderColor: 'transparent' };
  const ticks = { color: '#5a6a84', font: { family: "'Space Mono', monospace", size: 9 } };

  chartTopBlocks = new Chart(document.getElementById('chart-top-blocks').getContext('2d'), {
    type: 'bar', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, borderRadius: 2 }] },
    options: { ...base, indexAxis: 'y', scales: { x: { min: 0, max: 100, grid, ticks: { ...ticks, callback: v => v + '%' } }, y: { grid: { display: false }, ticks: { ...ticks, color: '#8a9bb8' } } } }
  });

  chartDistricts = new Chart(document.getElementById('chart-districts').getContext('2d'), {
    type: 'bar', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, borderRadius: 2 }] },
    options: { ...base, scales: { y: { min: 0, max: 100, grid, ticks: { ...ticks, callback: v => v + '%' } }, x: { grid: { display: false }, ticks: { ...ticks, color: '#8a9bb8' } } } }
  });
}

function updateBottomCharts() {
  if (!chartTopBlocks || !chartDistricts) return;
  let blocks = Object.values(state.blockDataMap);
  if (state.districtFilter !== 'all') blocks = blocks.filter(r => (r._district || '').toLowerCase() === state.districtFilter.toLowerCase());

  const top15 = [...blocks].sort((a, b) => b._conf - a._conf).slice(0, 15);
  
  chartTopBlocks.data.labels = top15.map(r => r.block_name);
  chartTopBlocks.data.datasets[0].data = top15.map(r => (r._conf * 100).toFixed(1));
  chartTopBlocks.data.datasets[0].backgroundColor = top15.map(r => state.energy === 'optimal' ? LABEL_COLORS[r._label] : suitabilityColor(r._conf));
  document.getElementById('chart1-label').textContent = 'RF Confidence';
  chartTopBlocks.update();

  const dists = Object.entries(state.districtMap).sort(([,a],[,b]) => b._conf - a._conf);
  chartDistricts.data.labels = dists.map(([d]) => d);
  chartDistricts.data.datasets[0].data = dists.map(([,a]) => (a._conf * 100).toFixed(1));
  chartDistricts.data.datasets[0].backgroundColor = dists.map(([,a]) => LABEL_COLORS[a._label] || '#3a4560');
  chartDistricts.update();
}

let analyticsInited = false; const aCharts = {};

function initAnalyticsCharts() {
  if (analyticsInited) return; analyticsInited = true;
  const rows = Object.values(state.blockDataMap), distMap = state.districtMap;
  const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const gridStyle = { color: 'rgba(42,52,72,0.6)', borderColor: 'transparent' };
  const ticks = { color: '#5a6a84', font: { family: "'Space Mono', monospace", size: 9 } };

  // 1. Prediction Dist
  const predCounts = { SOLAR: 0, WIND: 0, BIOMASS: 0, HYBRID: 0 };
  rows.forEach(r => { if(predCounts[r._label] !== undefined) predCounts[r._label]++; });
  aCharts.predDist = new Chart(document.getElementById('chart-pred-dist').getContext('2d'), {
    type: 'bar', data: { labels: ['SOLAR','WIND','BIOMASS','HYBRID'], datasets: [{ data: [predCounts.SOLAR, predCounts.WIND, predCounts.BIOMASS, predCounts.HYBRID], backgroundColor: [LABEL_COLORS.SOLAR, LABEL_COLORS.WIND, LABEL_COLORS.BIOMASS, LABEL_COLORS.HYBRID] }] },
    options: { ...base, scales: { y: { grid: gridStyle, ticks }, x: { grid: { display: false }, ticks } } }
  });

  // 2. Confidence Dist
  const confBins = { '60-70': 0, '70-80': 0, '80-90': 0, '90-95': 0, '95-99': 0, '99-100': 0 };
  rows.forEach(r => { const c = r._conf * 100; if(c<70) confBins['60-70']++; else if(c<80) confBins['70-80']++; else if(c<90) confBins['80-90']++; else if(c<95) confBins['90-95']++; else if(c<99) confBins['95-99']++; else confBins['99-100']++; });
  aCharts.confDist = new Chart(document.getElementById('chart-conf-dist').getContext('2d'), {
    type: 'bar', data: { labels: Object.keys(confBins), datasets: [{ data: Object.values(confBins), backgroundColor: ['#d0e048','#78c679','#43a047','#1a9641','#0288d1','#4fc3f7'] }] },
    options: { ...base, scales: { y: { grid: gridStyle, ticks }, x: { grid: { display: false }, ticks } } }
  });

  // 3. Scatter
  aCharts.scatter = new Chart(document.getElementById('chart-scatter').getContext('2d'), {
    type: 'scatter', data: { datasets: ['SOLAR','WIND','BIOMASS','HYBRID'].map(l => ({ label: l, data: rows.filter(r => r._label === l).map(r => ({ x: parseFloat(r[state.scatterFeature])||0, y: r._conf*100 })), backgroundColor: LABEL_COLORS[l]+'bb' })) },
    options: { ...base, plugins: { legend: { display: true, labels: { color: '#8a9bb8', font: { size: 10 } } } }, scales: { x: { grid: gridStyle, ticks }, y: { min: 50, max: 105, grid: gridStyle, ticks: { ...ticks, callback: v=>v+'%' } } } }
  });

  const distData = Object.entries(distMap).map(([name, agg]) => ({ name, constraint: agg.constraint_pct, conf: agg._conf, agree: agg._agreeCount, total: agg.blockCount, counts: agg._labelCounts }));
  
  // 4. Constraints Dist
  const cnstData = [...distData].sort((a,b) => b.constraint - a.constraint);
  aCharts.constraintDist = new Chart(document.getElementById('chart-constraint-dist').getContext('2d'), {
    type: 'bar', data: { labels: cnstData.map(d => d.name), datasets: [{ data: cnstData.map(d => d.constraint), backgroundColor: cnstData.map(d => constraintColor(d.constraint)) }] },
    options: { ...base, scales: { y: { min: 0, max: 100, grid: gridStyle, ticks: { ...ticks, callback: v=>v+'%' } }, x: { grid: { display: false }, ticks } } }
  });

  // 5. Agreement
  const agreeData = [...distData].sort((a,b) => (b.agree/b.total) - (a.agree/a.total));
  aCharts.agreement = new Chart(document.getElementById('chart-agreement').getContext('2d'), {
    type: 'bar', data: { labels: agreeData.map(d => d.name), datasets: [{ label: 'Agree', data: agreeData.map(d => d.agree), backgroundColor: '#43a047' }, { label: 'Disagree', data: agreeData.map(d => d.total - d.agree), backgroundColor: '#ef5350' }] },
    options: { ...base, plugins: { legend: { display: true, labels: { color: '#8a9bb8', font: { size: 10 } } } }, scales: { x: { stacked: true, grid: { display: false }, ticks }, y: { stacked: true, grid: gridStyle, ticks } } }
  });

  // 6. Confidence by Dist
  const cfData = [...distData].sort((a,b) => b.conf - a.conf);
  aCharts.confByDist = new Chart(document.getElementById('chart-conf-by-dist').getContext('2d'), {
    type: 'bar', data: { labels: cfData.map(d => d.name), datasets: [{ data: cfData.map(d => d.conf * 100), backgroundColor: cfData.map(d => suitabilityColor(d.conf)) }] },
    options: { ...base, scales: { y: { min: 50, max: 100, grid: gridStyle, ticks: { ...ticks, callback: v=>v+'%' } }, x: { grid: { display: false }, ticks } } }
  });

  // 7. Energy Mix
  const mixData = [...distData].sort((a,b) => a.name.localeCompare(b.name));
  aCharts.energyMix = new Chart(document.getElementById('chart-energy-mix').getContext('2d'), {
    type: 'bar', data: { labels: mixData.map(d => d.name), datasets: [{ label: 'SOLAR', data: mixData.map(d => d.counts.SOLAR || 0), backgroundColor: LABEL_COLORS.SOLAR }, { label: 'WIND', data: mixData.map(d => d.counts.WIND || 0), backgroundColor: LABEL_COLORS.WIND }, { label: 'BIOMASS', data: mixData.map(d => d.counts.BIOMASS || 0), backgroundColor: LABEL_COLORS.BIOMASS }, { label: 'HYBRID', data: mixData.map(d => d.counts.HYBRID || 0), backgroundColor: LABEL_COLORS.HYBRID }] },
    options: { ...base, plugins: { legend: { display: true, labels: { color: '#8a9bb8', font: { size: 10 } } } }, scales: { x: { stacked: true, grid: { display: false }, ticks }, y: { stacked: true, grid: gridStyle, ticks } } }
  });

  document.getElementById('da-block-count').textContent = rows.length;
  document.getElementById('da-dist-count').textContent  = Object.keys(distMap).length;

  // Interactions
  document.getElementById('scatter-feature-select').addEventListener('change', e => {
    state.scatterFeature = e.target.value;
    aCharts.scatter.data.datasets.forEach(ds => {
      ds.data = rows.filter(r => r._label === ds.label).map(r => ({ x: parseFloat(r[state.scatterFeature])||0, y: r._conf*100 }));
    });
    aCharts.scatter.update();
  });

  document.querySelectorAll('.acard-tab').forEach(btn => btn.addEventListener('click', e => {
    const mode = e.target.dataset.predmode;
    document.querySelectorAll('.acard-tab').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const counts = { SOLAR: 0, WIND: 0, BIOMASS: 0, HYBRID: 0 };
    if (mode === 'block') { rows.forEach(r => { if(counts[r._label] !== undefined) counts[r._label]++; }); } 
    else { Object.values(distMap).forEach(d => { if(counts[d._label] !== undefined) counts[d._label]++; }); }
    aCharts.predDist.data.datasets[0].data = [counts.SOLAR, counts.WIND, counts.BIOMASS, counts.HYBRID];
    aCharts.predDist.update();
  }));
}

function showBlockInfoPanel(name, dist, row) {
  document.getElementById('block-info-content').innerHTML = `
    <div class="bi-name">${name}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${dist}</div>
    <span class="bi-label-pill" style="background:${LABEL_COLORS[row._label]}22;color:${LABEL_COLORS[row._label]};border:1px solid ${LABEL_COLORS[row._label]}55">
      ${LABEL_ICONS[row._label]} ${row._label} &nbsp;·&nbsp; ${(row._conf*100).toFixed(1)}% conf
    </span>
    <span class="bi-score" style="color:${suitabilityColor(row._conf)}">${(row._conf*100).toFixed(1)}%</span>
    <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;">RF CONFIDENCE</div>
    <div class="bi-row"><span>Solar</span><span class="bi-val">${parseFloat(row.solar_mean).toFixed(3)}</span></div>
    <div class="bi-row"><span>Wind</span><span class="bi-val">${parseFloat(row.wind_mean).toFixed(3)}</span></div>
  `;
  document.getElementById('block-info-section').style.display = 'block';
}

function switchToView(view) {
  state.activeView = view;
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${view}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'map') setTimeout(() => map.invalidateSize(), 50);
  else if (view === 'split') activateSplitView();
  else if (view === 'charts') initAnalyticsCharts();
}

function bindControls() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchToView(btn.dataset.view)));

  document.getElementById('view-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.tgl-btn');
    if (!btn || btn.dataset.view === state.mapView) return;
    state.mapView = btn.dataset.view;
    document.querySelectorAll('#view-toggle .tgl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['district-filter', 'label-filter', 'toggle-constraints'].forEach(id => document.getElementById(id).disabled = (state.mapView === 'district'));
    rerender();
  });

  document.getElementById('energy-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.tgl-btn');
    if (!btn || btn.dataset.energy === state.energy) return;
    state.energy = btn.dataset.energy;
    document.querySelectorAll('#energy-toggle .tgl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.getElementById('legend-optimal').style.display = (state.energy === 'optimal') ? 'flex' : 'none';
    document.getElementById('legend-suitability').style.display = (state.energy !== 'optimal' && state.energy !== 'constraints') ? 'flex' : 'none';
    document.getElementById('legend-constraints-key').style.display = (state.energy === 'constraints') ? 'flex' : 'none';
    rerender();
  });

  document.getElementById('district-filter').addEventListener('change', e => { state.districtFilter = e.target.value; rerender(); });
  document.getElementById('label-filter').addEventListener('change', e => { state.labelFilter = e.target.value; rerender(); });
  document.getElementById('toggle-constraints').addEventListener('change', e => {
    state.showConstraints = e.target.checked;
    state.showConstraints && state.mapView === 'block' ? renderConstraintLayer() : clearConstraintLayer();
  });
}

function showError(msg) {
  document.getElementById('error-msg').textContent = '⚠ ' + msg;
  document.getElementById('error-banner').style.display = 'flex';
}

async function loadData() {
  try {
    const [csvResp, blocksResp, distResp] = await Promise.all([
      fetch('./block_features.csv'), fetch('./data/blocks_complete.geojson'), fetch('./data/districts_fixed.geojson')
    ]);

    if (!csvResp.ok || !blocksResp.ok || !distResp.ok) throw new Error('Data fetch failed.');

    const csvRows = parseCSV(await csvResp.text());
    state.blockDataMap = buildBlockDataMap(csvRows);
    state.blockGeoJSON = await blocksResp.json();
    state.districtGeoJSON = await distResp.json();

    const { blockKey, distKey } = scanGeoJSONProps(state.blockGeoJSON);
    state._geoBlockKey = blockKey; state._geoDistKey = distKey;

    state.districtMap = buildDistrictMap(state.blockGeoJSON, state.blockDataMap);

    populateDistrictFilter();
    initBottomCharts();
    bindControls();
    rerender();
    document.getElementById('loading-overlay').style.display = 'none';
  } catch (err) {
    document.getElementById('loading-overlay').style.display = 'none';
    showError(`Load error: ${err.message}`);
  }
}

document.addEventListener('DOMContentLoaded', loadData);