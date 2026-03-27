/* ═══════════════════════════════════════════════════════════════
   Odisha Renewable Energy DSS — app.js  Phase 8 (Enhanced)
   • Original Phase 7 code preserved intact
   • NEW: Split Map, D3 charts, Agreement Inset, Feature Profile
═══════════════════════════════════════════════════════════════ */

// ─────────────────── Constants ───────────────────
const COLS = {
  blockName:"block_name", district:"district_n", prediction:"final_prediction",
  confidence:"rf_confidence", cluster:"cluster", solar:"solar_mean", wind:"wind_mean",
  biomass:"pop_mean", distRoads:"dist_roads_mean", distTrans:"dist_trans_mean",
  distSub:"dist_sub_mean", constraint:"constraint_pct"
};
const COLORS = { SOLAR:"#FF8C00", WIND:"#1E90FF", BIOMASS:"#32CD32", HYBRID:"#9B59B6", UNKNOWN:"#2a3550" };
const CHART_COLORS = {SOLAR:'rgba(255,140,0,0.8)',WIND:'rgba(30,144,255,0.8)',BIOMASS:'rgba(50,205,50,0.8)',HYBRID:'rgba(155,89,182,0.8)'};
const CHART_GRID = 'rgba(100,150,255,0.08)', CHART_TEXT = '#7788aa';

// ─────────────────── State ───────────────────
let map, blocksLayer=null, blocksData=null, districtsData=null;
let currentMode="allocation", currentScale="block";
let confidenceThreshold=0, constraintMax=100;
let activeEnergyFilter="ALL", activeDistrictFilter="ALL", drilldownDistrict=null;
let overlayLayers={solar:null,wind:null,biomass:null};
let chartBar=null, chartConf=null, chartScatter=null, chartConstraint=null, chartAgreement=null;
let districtStats={};

// NEW: Split map state
let mapLeft=null, mapRight=null, splitLayerLeft=null, splitLayerRight=null;
let splitSyncing=false; // prevent infinite sync loop

// ─────────────────── Map Initialization ───────────────────
function initMap() {
  map = L.map('map',{center:[20.5,84.5],zoom:7});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {attribution:'© OpenStreetMap © CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);
}

// ─────────────────── Data Loading ───────────────────
async function loadData() {
  showSpinner("Loading block data...");
  try {
    const res = await fetch('data/blocks_complete.geojson');
    if (!res.ok) throw new Error("blocks fetch failed: "+res.status);
    blocksData = await res.json();
    const res2 = await fetch('data/districts_fixed.geojson');
    if (res2.ok) {
      districtsData = await res2.json();
      // DEBUG: log first feature's properties so we can see actual key names
      if (districtsData.features && districtsData.features.length > 0) {
        console.log('🗺️ districts.geojson first feature properties:', districtsData.features[0].properties);
      }
    } else console.warn("districts.geojson not found");
    buildDistrictStats();
    renderLayer(); updateStats(); updateSummary(); updateSummaryTable();
    loadHotspot('solar','data/top_solar_zones.geojson','#FF8C00');
    loadHotspot('wind','data/top_wind_zones.geojson','#1E90FF');
    loadHotspot('biomass','data/top_biomass_zones.geojson','#32CD32');
    // Render agreement inset after data loads
    renderAgreementInset();
  } catch(e) {
    console.error("Failed to load data:",e);
    document.getElementById('summary-content').innerHTML='<p style="color:#ff5555">Error loading data. Check DevTools (F12).</p>';
  } finally { hideSpinner(); }
}

function showSpinner(msg) {
  document.getElementById('loading-text').textContent = msg||'Loading...';
  document.getElementById('loading-overlay').classList.remove('hidden');
}
function hideSpinner() { document.getElementById('loading-overlay').classList.add('hidden'); }

// ─────────────────── Helpers ───────────────────
function getPrediction(props) { return (props[COLS.prediction]||"UNKNOWN").toString().toUpperCase().trim(); }
function getConfidence(props) { let c=parseFloat(props[COLS.confidence])||0; return c<=1?c*100:c; }
function getConstraint(props) { return parseFloat(props[COLS.constraint])||0; }

function passesFilters(props) {
  const pred=getPrediction(props), conf=getConfidence(props), cons=getConstraint(props), dist=props[COLS.district]||"";
  if (activeEnergyFilter!=="ALL" && pred!==activeEnergyFilter) return false;
  if (conf<confidenceThreshold) return false;
  if (cons>constraintMax) return false;
  if (activeDistrictFilter!=="ALL" && dist!==activeDistrictFilter) return false;
  return true;
}

function getFilteredFeatures() {
  if (!blocksData) return [];
  let features = blocksData.features;
  if (drilldownDistrict) features = features.filter(f=>f.properties[COLS.district]===drilldownDistrict);
  return features.filter(f=>passesFilters(f.properties));
}

// ─────────────────── District Stats ───────────────────
function buildDistrictStats() {
  if (!blocksData) return;
  districtStats={};
  blocksData.features.forEach(f=>{
    const p=f.properties, d=p[COLS.district]||"Unknown", pred=getPrediction(p), conf=getConfidence(p);
    if (!districtStats[d]) districtStats[d]={counts:{},totalConf:0,blockCount:0,blocks:[]};
    districtStats[d].counts[pred]=(districtStats[d].counts[pred]||0)+1;
    districtStats[d].totalConf+=conf; districtStats[d].blockCount+=1; districtStats[d].blocks.push(f);
  });
  Object.keys(districtStats).forEach(d=>{
    const s=districtStats[d];
    s.dominant=Object.entries(s.counts).sort((a,b)=>b[1]-a[1])[0][0];
    s.avgConf=s.totalConf/s.blockCount;
    s.maupCount=s.blocks.filter(f=>getPrediction(f.properties)!==s.dominant).length;
    s.agreeCount=s.blockCount-s.maupCount;
    s.agreePct=((s.agreeCount/s.blockCount)*100).toFixed(1);
  });
}

// ─────────────────── Scale Switch ───────────────────
function switchScale(scale) {
  if (scale==='district'&&!districtsData){alert("districts.geojson not found in data/ folder.");return;}
  currentScale=scale; drilldownDistrict=null;
  document.querySelectorAll('.scale-btn').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase()===scale));
  document.getElementById('drilldown-back').style.display='none';
  document.getElementById('stat-scale').textContent=scale.charAt(0).toUpperCase()+scale.slice(1);
  showSpinner("Switching scale...");
  setTimeout(()=>{renderLayer();updateStats();hideSpinner();},50);
}

function drillIntoDistrict(districtName) {
  drilldownDistrict=districtName; currentScale="block";
  document.querySelectorAll('.scale-btn').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase()==='block'));
  document.getElementById('drilldown-back').style.display='block';
  document.getElementById('stat-scale').textContent=`Block · ${districtName}`;
  document.getElementById('district-filter').value=districtName;
  activeDistrictFilter=districtName;
  showSpinner(`Loading ${districtName} blocks...`);
  setTimeout(()=>{
    renderLayer(); updateStats();
    if (blocksLayer) try{map.fitBounds(blocksLayer.getBounds(),{padding:[30,30]});}catch(e){}
    hideSpinner();
  },50);
}

function exitDrilldown() {
  drilldownDistrict=null; activeDistrictFilter="ALL"; currentScale="district";
  document.getElementById('district-filter').value="ALL";
  document.getElementById('drilldown-back').style.display='none';
  document.querySelectorAll('.scale-btn').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase()==='district'));
  document.getElementById('stat-scale').textContent='District';
  renderLayer(); updateStats(); map.setView([20.5,84.5],7);
}

// ─────────────────── Layer Rendering ───────────────────
function renderLayer() {
  if (blocksLayer){map.removeLayer(blocksLayer);blocksLayer=null;}
  if (currentScale==="district"&&districtsData&&!drilldownDistrict) renderDistrictLayer();
  else renderBlockLayer();
}

function renderDistrictLayer() {
  blocksLayer=L.geoJSON(districtsData,{style:styleDistrict,onEachFeature:onEachDistrict}).addTo(map);
  // Auto-zoom to fit all districts
  try { map.fitBounds(blocksLayer.getBounds(), {padding:[20,20]}); } catch(e){}
  document.getElementById('legend-box').style.display=currentMode==='allocation'?'block':'none';
  document.getElementById('constraint-legend').style.display=currentMode==='constraints'?'block':'none';
}

/** Try multiple common property key variants to find the district name */
function getDistrictNameFromFeature(feature) {
  const p = feature.properties;
  // Try known keys in priority order
  const candidates = ['district_n','district_name','DISTRICT','District','dist_name','NAME','name','dtname','dt_name'];
  for (const key of candidates) {
    if (p[key] && typeof p[key]==='string' && p[key].trim()!=='') return p[key].trim();
  }
  // Last resort: find any string property that matches a known district stat key
  for (const key of Object.keys(p)) {
    const val = (p[key]||'').toString().trim();
    if (districtStats[val]) return val;
  }
  return null;
}

function styleDistrict(feature) {
  const d = getDistrictNameFromFeature(feature);
  const stat = d ? districtStats[d] : null;

  // Always show district boundaries even if no stat match
  const baseStyle = {color:'#4466aa', weight:1.2, opacity:0.9};

  if (!stat) {
    // Visible fallback — dim blue so boundaries are still visible
    return {...baseStyle, fillColor:'#1e2d50', fillOpacity:0.6};
  }
  if (currentMode==='constraints') {
    const cPct = parseFloat(feature.properties.constraint_pct) || 0;
    return {...baseStyle, fillColor:constraintColor(cPct), fillOpacity:0.75};
  }
  const col = COLORS[stat.dominant] || '#1e2d50';
  return {...baseStyle, fillColor:col, fillOpacity:0.7, color:col, opacity:0.95};
}

function onEachDistrict(feature,layer) {
  const d = getDistrictNameFromFeature(feature);
  const stat = d ? districtStats[d] : null;

  // Always bind a tooltip
  const label = d || 'Unknown District';
  const tipContent = stat
    ? `<strong>${label}</strong><br/><span style="color:${COLORS[stat.dominant]||'#aaa'}">${stat.dominant}</span> — ${stat.avgConf.toFixed(1)}% avg conf<br/>${stat.blockCount} blocks · ${stat.maupCount} MAUP`
    : `<strong>${label}</strong><br/><em style="color:#556688">No block data matched</em>`;
  layer.bindTooltip(tipContent, {sticky:true, opacity:0.97});

  layer.on('mouseover', function(){this.setStyle({weight:2.5, fillOpacity:0.92});this.bringToFront();});
  layer.on('mouseout',  function(){if(blocksLayer)blocksLayer.resetStyle(this);});
  layer.on('click', function(){
    if (d) drillIntoDistrict(d);
    else {
      // Debug: log the actual properties so user can fix COLS mapping
      console.warn('District feature properties:', feature.properties);
    }
  });
}

function renderBlockLayer() {
  let features=blocksData?[...blocksData.features]:[];
  if (drilldownDistrict) features=features.filter(f=>f.properties[COLS.district]===drilldownDistrict);
  const filteredGeoJSON={type:"FeatureCollection",features:features.filter(f=>passesFilters(f.properties))};

  if (currentMode==="allocation") {
    blocksLayer=L.geoJSON(filteredGeoJSON,{style:styleAllocation,onEachFeature:onEachBlock}).addTo(map);
  } else if (currentMode==="constraints") {
    blocksLayer=L.geoJSON(filteredGeoJSON,{style:f=>({fillColor:constraintColor(getConstraint(f.properties)),fillOpacity:0.78,color:'#1a2035',weight:0.5}),onEachFeature:onEachBlock}).addTo(map);
  } else {
    const colMap={solar:COLS.solar,wind:COLS.wind,biomass:COLS.biomass};
    const scaleMap={solar:['#d73027','#fee08b','#1a9850'],wind:['#deebf7','#6baed6','#08519c'],biomass:['#ffffcc','#a1dab4','#225ea8']};
    const col=colMap[currentMode];
    const vals=filteredGeoJSON.features.map(f=>parseFloat(f.properties[col])).filter(v=>!isNaN(v));
    if (vals.length===0){blocksLayer=L.geoJSON(filteredGeoJSON,{onEachFeature:onEachBlock}).addTo(map);return;}
    const scale=chroma.scale(scaleMap[currentMode]).domain([Math.min(...vals),Math.max(...vals)]);
    blocksLayer=L.geoJSON(filteredGeoJSON,{style:f=>{const v=parseFloat(f.properties[col]);return{fillColor:isNaN(v)?"#1a2035":scale(v).hex(),fillOpacity:0.75,color:"#1a2540",weight:0.5};},onEachFeature:onEachBlock}).addTo(map);
  }
  document.getElementById('legend-box').style.display=currentMode==='allocation'?'block':'none';
  document.getElementById('constraint-legend').style.display=currentMode==='constraints'?'block':'none';
}

function constraintColor(pct) {
  if (pct<20) return '#1a9850';
  if (pct<50) return '#fee08b';
  if (pct<80) return '#f46d43';
  return '#8B0000';
}

function styleAllocation(feature) {
  const pred=getPrediction(feature.properties);
  return {fillColor:COLORS[pred]||COLORS.UNKNOWN,fillOpacity:0.65,color:COLORS[pred]||COLORS.UNKNOWN,weight:0.8,opacity:0.9};
}

function onEachBlock(feature,layer) {
  const p=feature.properties, name=p[COLS.blockName]||"Unknown";
  const pred=getPrediction(p), conf=getConfidence(p).toFixed(1), cons=getConstraint(p).toFixed(1);
  layer.bindTooltip(`<strong>${name}</strong><br/>${p[COLS.district]||""}<br/><span style="color:${COLORS[pred]||'#aaa'}">${pred}</span> — ${conf}% conf<br/>Constraint: ${cons}%`,{sticky:true,opacity:0.97});
  layer.on('mouseover',function(){this.setStyle({weight:2.5,fillOpacity:0.9});this.bringToFront();});
  layer.on('mouseout',function(){if(blocksLayer)blocksLayer.resetStyle(this);});
  layer.on('click',function(){showDetail(p);});
}

// ─────────────────── Detail Panel ───────────────────
function showDetail(p) {
  const pred=getPrediction(p), conf=getConfidence(p), cons=getConstraint(p);
  document.getElementById('detail-default').style.display='none';
  document.getElementById('detail-block').style.display='block';
  document.getElementById('detail-block-name').textContent=p[COLS.blockName]||"Unknown";
  document.getElementById('detail-district').textContent=p[COLS.district]?"📍 "+p[COLS.district]:"";
  const badge=document.getElementById('detail-prediction-badge');
  badge.textContent=pred; badge.className="badge-"+pred;
  const confBar=document.getElementById('detail-confidence-bar');
  confBar.style.width=conf+"%"; confBar.style.background=COLORS[pred]||"#aaa";
  document.getElementById('detail-confidence-text').textContent=conf.toFixed(1)+"%";
  const consBar=document.getElementById('detail-constraint-bar');
  consBar.style.width=cons+"%"; consBar.style.background=constraintColor(cons);
  document.getElementById('detail-constraint-text').textContent=cons.toFixed(1)+"%";
  document.getElementById('detail-cluster').textContent="Cluster "+(p[COLS.cluster]??"N/A");
  document.getElementById('detail-features-table').innerHTML=
    [["Solar Mean",p[COLS.solar]],["Wind Mean",p[COLS.wind]],["Population Mean",p[COLS.biomass]],
     ["Dist. to Roads",p[COLS.distRoads]],["Dist. to Trans.",p[COLS.distTrans]],
     ["Dist. to Subst.",p[COLS.distSub]],["Constraint %",p[COLS.constraint]]]
    .map(([l,v])=>v!=null?`<tr><td>${l}</td><td>${parseFloat(v).toFixed(3)}</td></tr>`:"").join("");
  // NEW: render mini D3 feature profile bar
  renderDetailFeatureBar(p, pred);
}

function closeDetail() {
  document.getElementById('detail-default').style.display='block';
  document.getElementById('detail-block').style.display='none';
}

// ─────────────────── NEW: D3 Mini Feature Profile Bar ───────────────────
function renderDetailFeatureBar(p, pred) {
  const svg = d3.select('#detail-feature-bar');
  svg.selectAll('*').remove();
  const container = document.getElementById('detail-feature-bar');
  const W = container.clientWidth || 220, H = 110;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const feats = [
    {key:COLS.solar, label:'Solar'},
    {key:COLS.wind, label:'Wind'},
    {key:COLS.biomass, label:'Pop'},
    {key:COLS.distRoads, label:'Roads'},
    {key:COLS.distTrans, label:'Trans'},
    {key:COLS.distSub, label:'Subst'},
    {key:COLS.constraint, label:'Constr'}
  ].map(f=>({label:f.label, val: Math.abs(parseFloat(p[f.key])||0)}));

  const maxVal = d3.max(feats, d=>d.val) || 1;
  const margin = {top:10,right:8,bottom:22,left:32};
  const w = W-margin.left-margin.right, h = H-margin.top-margin.bottom;

  const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(feats.map(d=>d.label)).range([0,w]).padding(0.25);
  const y = d3.scaleLinear().domain([0,maxVal]).nice().range([h,0]);

  // Grid
  g.append('g').attr('class','d3-grid')
   .call(d3.axisLeft(y).ticks(3).tickSize(-w).tickFormat(''))
   .select('.domain').remove();

  // Bars
  const color = COLORS[pred]||'#6699ff';
  g.selectAll('rect').data(feats).enter().append('rect')
   .attr('x',d=>x(d.label)).attr('y',d=>y(d.val))
   .attr('width',x.bandwidth()).attr('height',d=>h-y(d.val))
   .attr('fill',color).attr('opacity',0.75).attr('rx',2);

  // X axis
  g.append('g').attr('transform',`translate(0,${h})`).attr('class','d3-axis')
   .call(d3.axisBottom(x).tickSize(0))
   .select('.domain').remove();
  g.selectAll('.d3-axis text').style('fill','#556688').style('font-size','9px');

  // Y axis (minimal)
  g.append('g').attr('class','d3-axis')
   .call(d3.axisLeft(y).ticks(3).tickFormat(d=>d3.format('.1s')(d)))
   .select('.domain').remove();
}

// ─────────────────── Filters ───────────────────
function switchLayer(mode) { currentMode=mode; renderLayer(); }

function filterByConfidence(val) {
  confidenceThreshold=parseFloat(val);
  document.getElementById('conf-value').textContent=val+"%";
  renderLayer(); updateStats();
}

function filterByConstraint(val) {
  constraintMax=parseFloat(val);
  document.getElementById('constraint-value').textContent=val+"%";
  renderLayer(); updateStats();
}

function setEnergyFilter(btn) {
  activeEnergyFilter=btn.dataset.energy;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderLayer(); updateStats();
}

function setDistrictFilter(val) {
  activeDistrictFilter=val;
  if (val!=="ALL"&&currentScale==="district") drillIntoDistrict(val);
  else if (val==="ALL"&&drilldownDistrict) exitDrilldown();
  else { renderLayer(); updateStats(); }
}

// ─────────────────── Hotspot Overlays ───────────────────
async function loadHotspot(type,url,color) {
  try {
    const res=await fetch(url); if(!res.ok)return;
    const data=await res.json();
    overlayLayers[type]=L.geoJSON(data,{style:{color,weight:2,fillColor:color,fillOpacity:0.2,dashArray:'5 5'}});
  } catch(e){console.log("Hotspot not loaded:",type);}
}

function toggleOverlay(type) {
  const layer=overlayLayers[type];
  if(!layer){console.log("Overlay not ready yet:",type);return;}
  if(map.hasLayer(layer))map.removeLayer(layer); else layer.addTo(map);
}

// ─────────────────── Stats Bar ───────────────────
function updateStats() {
  if(!blocksData)return;
  const counts={SOLAR:0,WIND:0,BIOMASS:0,HYBRID:0};
  let highConf=0, showing=0;
  getFilteredFeatures().forEach(f=>{
    const pred=getPrediction(f.properties), conf=getConfidence(f.properties);
    if(counts[pred]!==undefined)counts[pred]++;
    if(conf>=80)highConf++; showing++;
  });
  document.getElementById('stat-solar').textContent=counts.SOLAR;
  document.getElementById('stat-wind').textContent=counts.WIND;
  document.getElementById('stat-biomass').textContent=counts.BIOMASS;
  document.getElementById('stat-hybrid').textContent=counts.HYBRID;
  document.getElementById('stat-highconf').textContent=`${highConf} (${showing>0?((highConf/showing)*100).toFixed(1):0}%)`;
  document.getElementById('stat-showing').textContent=showing;
}

function updateSummary() {
  if(!blocksData)return;
  const counts={SOLAR:0,WIND:0,BIOMASS:0,HYBRID:0};
  blocksData.features.forEach(f=>{const p=getPrediction(f.properties);if(counts[p]!==undefined)counts[p]++;});
  document.getElementById('summary-content').innerHTML=`
    <p>☀️ Solar: <strong style="color:#FF8C00">${counts.SOLAR}</strong></p>
    <p>💨 Wind: <strong style="color:#1E90FF">${counts.WIND}</strong></p>
    <p>🌿 Biomass: <strong style="color:#32CD32">${counts.BIOMASS}</strong></p>
    <p>⚡ Hybrid: <strong style="color:#9B59B6">${counts.HYBRID}</strong></p>
    <p>📊 Total: <strong style="color:#aac4ff">${blocksData.features.length}</strong> blocks</p>`;
}

function updateSummaryTable() {
  if(!blocksData||Object.keys(districtStats).length===0)return;
  const totalBlocks=blocksData.features.length;
  let bAgree=0, bMaup=0;
  blocksData.features.forEach(f=>{
    const p=f.properties, pred=getPrediction(p), dStat=districtStats[p[COLS.district]];
    if(dStat){if(pred===dStat.dominant)bAgree++;else bMaup++;}
  });
  const bAgreePct=((bAgree/totalBlocks)*100).toFixed(1);
  const totalDistricts=Object.keys(districtStats).length;
  const dCounts={};
  Object.values(districtStats).forEach(s=>{dCounts[s.dominant]=(dCounts[s.dominant]||0)+1;});
  const topDist=Object.entries(dCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'N/A';
  document.getElementById('summary-table-body').innerHTML=`
    <tr><td>Block</td><td>${totalBlocks}</td><td style="color:${COLORS['SOLAR']}">SOLAR</td><td class="agree-pct">${bAgreePct}%</td><td class="maup-count">${bMaup}</td></tr>
    <tr><td>District</td><td>${totalDistricts}</td><td style="color:${COLORS[topDist]||'#aaa'}">${topDist}</td><td class="agree-pct">—</td><td class="maup-count">—</td></tr>`;
}

// ─────────────────── NEW: Agreement Inset (D3 donut) ───────────────────
function renderAgreementInset() {
  if (!blocksData || Object.keys(districtStats).length===0) return;
  let agree=0, disagree=0;
  blocksData.features.forEach(f=>{
    const p=f.properties, pred=getPrediction(p), dStat=districtStats[p[COLS.district]];
    if(dStat){ if(pred===dStat.dominant) agree++; else disagree++; }
  });
  const total=agree+disagree;
  const svg=d3.select('#inset-svg');
  svg.selectAll('*').remove();
  const W=140, H=80, cx=70, cy=40, outerR=32, innerR=18;
  const data=[{val:agree,color:'#32CD32'},{val:disagree,color:'#FF5555'}];
  const pie=d3.pie().value(d=>d.val).sort(null);
  const arc=d3.arc().innerRadius(innerR).outerRadius(outerR);
  const g=svg.append('g').attr('transform',`translate(${cx},${cy})`);
  g.selectAll('path').data(pie(data)).enter().append('path')
    .attr('d',arc).attr('fill',d=>d.data.color).attr('opacity',0.85)
    .attr('stroke','rgba(0,0,0,0.3)').attr('stroke-width',1);
  // Center text
  g.append('text').attr('text-anchor','middle').attr('dy','0.35em')
    .attr('fill','#ccd9ff').attr('font-size','11px').attr('font-family','Rajdhani, sans-serif').attr('font-weight','700')
    .text(`${((agree/total)*100).toFixed(0)}%`);
  // Side labels
  svg.append('text').attr('x',112).attr('y',28).attr('fill','#32CD32').attr('font-size','9px').attr('font-family','Inter, sans-serif').text(agree);
  svg.append('text').attr('x',112).attr('y',54).attr('fill','#FF5555').attr('font-size','9px').attr('font-family','Inter, sans-serif').text(disagree);
}

// ─────────────────── Tab Switching ───────────────────
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById('btn-'+tab).classList.add('active');
  if(tab==='map') setTimeout(()=>map&&map.invalidateSize(),100);
  if(tab==='charts') setTimeout(()=>{ buildCharts(); buildD3Charts(); },100);
  if(tab==='split') setTimeout(()=>initSplitMap(),150);
}

// ─────────────────── Chart.js Charts ───────────────────
function buildCharts() {
  if(!blocksData)return;
  buildBarChart('block'); buildConfChart(); buildScatterChart(); buildConstraintChart(); buildAgreementChart();
}

function buildBarChart(mode) {
  const ctx=document.getElementById('chart-bar'); if(!ctx)return;
  if(chartBar)chartBar.destroy();
  let labels,data,bgColors;
  if(mode==='block'){
    const counts={SOLAR:0,WIND:0,BIOMASS:0,HYBRID:0};
    blocksData.features.forEach(f=>{const p=getPrediction(f.properties);if(counts[p]!==undefined)counts[p]++;});
    labels=Object.keys(counts); data=Object.values(counts); bgColors=labels.map(l=>CHART_COLORS[l]);
  } else {
    const counts={};
    Object.values(districtStats).forEach(s=>{counts[s.dominant]=(counts[s.dominant]||0)+1;});
    labels=Object.keys(counts); data=Object.values(counts); bgColors=labels.map(l=>CHART_COLORS[l]||'rgba(100,150,255,0.6)');
  }
  chartBar=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:mode==='block'?'Blocks':'Districts',data,backgroundColor:bgColors,borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.raw} ${mode}s`}}},scales:{x:{ticks:{color:CHART_TEXT},grid:{color:CHART_GRID}},y:{ticks:{color:CHART_TEXT,stepSize:1},grid:{color:CHART_GRID}}}}});
}

function setBarMode(mode,btn) {
  document.querySelectorAll('#card-bar .ctoggle').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); buildBarChart(mode);
}

function buildConfChart() {
  const ctx=document.getElementById('chart-conf'); if(!ctx)return;
  if(chartConf)chartConf.destroy();
  const bins=['60-70','70-80','80-90','90-95','95-99','99-100'], counts=[0,0,0,0,0,0];
  const colors=['rgba(255,100,100,0.75)','rgba(255,165,0,0.75)','rgba(255,200,50,0.75)','rgba(100,200,100,0.75)','rgba(50,180,255,0.75)','rgba(100,150,255,0.75)'];
  blocksData.features.forEach(f=>{
    const c=getConfidence(f.properties);
    if(c<70)counts[0]++; else if(c<80)counts[1]++; else if(c<90)counts[2]++; else if(c<95)counts[3]++; else if(c<99)counts[4]++; else counts[5]++;
  });
  chartConf=new Chart(ctx,{type:'bar',data:{labels:bins,datasets:[{label:'Blocks',data:counts,backgroundColor:colors,borderRadius:4,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.raw} blocks`}}},scales:{x:{ticks:{color:CHART_TEXT},grid:{color:CHART_GRID}},y:{ticks:{color:CHART_TEXT},grid:{color:CHART_GRID}}}}});
}

function buildScatterChart() {
  const ctx=document.getElementById('chart-scatter'); if(!ctx)return;
  if(chartScatter)chartScatter.destroy();
  const feature=document.getElementById('scatter-feature')?.value||'solar_mean';
  const datasets={};
  blocksData.features.forEach(f=>{
    const p=f.properties, pred=getPrediction(p), x=parseFloat(p[feature]), conf=getConfidence(p);
    if(isNaN(x))return;
    if(!datasets[pred])datasets[pred]=[];
    datasets[pred].push({x,y:parseFloat(conf.toFixed(1))});
  });
  const ds=Object.entries(datasets).map(([pred,points])=>({label:pred,data:points,backgroundColor:CHART_COLORS[pred]||'rgba(200,200,200,0.6)',pointRadius:3,pointHoverRadius:5}));
  chartScatter=new Chart(ctx,{type:'scatter',data:{datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:CHART_TEXT,boxWidth:10,font:{size:11}}}},scales:{x:{title:{display:true,text:feature.replace(/_/g,' '),color:CHART_TEXT},ticks:{color:CHART_TEXT},grid:{color:CHART_GRID}},y:{title:{display:true,text:'Confidence %',color:CHART_TEXT},ticks:{color:CHART_TEXT},grid:{color:CHART_GRID},min:55,max:105}}}});
}

function updateScatter() { buildScatterChart(); }

function buildConstraintChart() {
  const ctx=document.getElementById('chart-constraint'); if(!ctx)return;
  if(chartConstraint)chartConstraint.destroy();
  const distAvg={};
  blocksData.features.forEach(f=>{
    const p=f.properties, d=p[COLS.district]||'Unknown', c=getConstraint(p);
    if(!distAvg[d])distAvg[d]={sum:0,n:0};
    distAvg[d].sum+=c; distAvg[d].n++;
  });
  const entries=Object.entries(distAvg).map(([d,v])=>({d,avg:v.sum/v.n})).sort((a,b)=>b.avg-a.avg);
  const labels=entries.map(e=>e.d), data=entries.map(e=>parseFloat(e.avg.toFixed(1)));
  const bgs=data.map(v=>v<20?'rgba(26,152,80,0.8)':v<50?'rgba(254,224,139,0.85)':v<80?'rgba(244,109,67,0.8)':'rgba(139,0,0,0.85)');
  chartConstraint=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Avg Constraint %',data,backgroundColor:bgs,borderRadius:3,borderSkipped:false}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.raw}%`}}},scales:{x:{min:0,max:100,ticks:{color:CHART_TEXT,callback:v=>v+'%'},grid:{color:CHART_GRID}},y:{ticks:{color:CHART_TEXT,font:{size:10}},grid:{color:CHART_GRID}}}}});
}

function buildAgreementChart() {
  const ctx=document.getElementById('chart-agreement'); if(!ctx)return;
  if(chartAgreement)chartAgreement.destroy();
  const entries=Object.entries(districtStats).sort((a,b)=>b[1].maupCount-a[1].maupCount).slice(0,20);
  const labels=entries.map(([d])=>d), agree=entries.map(([,s])=>s.agreeCount), maup=entries.map(([,s])=>s.maupCount);
  chartAgreement=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Agree',data:agree,backgroundColor:'rgba(50,205,80,0.75)',borderRadius:3,borderSkipped:false},{label:'MAUP Disagree',data:maup,backgroundColor:'rgba(255,80,80,0.75)',borderRadius:3,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:CHART_TEXT,boxWidth:10,font:{size:11}}}},scales:{x:{stacked:true,ticks:{color:CHART_TEXT,font:{size:10},maxRotation:45},grid:{color:CHART_GRID}},y:{stacked:true,ticks:{color:CHART_TEXT},grid:{color:CHART_GRID}}}}});
}

// ─────────────────── NEW: D3 Charts ───────────────────
function buildD3Charts() {
  if (!blocksData || Object.keys(districtStats).length===0) return;
  buildD3ConfLine();
  buildD3StackBar();
}

/** D3 Line chart: average confidence per district */
function buildD3ConfLine() {
  const container = document.getElementById('d3-conf-line');
  d3.select(container).selectAll('*').remove();
  const entries = Object.entries(districtStats)
    .map(([d,s])=>({d, avgConf:s.avgConf}))
    .sort((a,b)=>b.avgConf-a.avgConf);

  const margin={top:12,right:20,bottom:62,left:42};
  const W=container.clientWidth||600, H=260;
  const w=W-margin.left-margin.right, h=H-margin.top-margin.bottom;

  const svg=d3.select(container).append('svg')
    .attr('width','100%').attr('height',H).attr('viewBox',`0 0 ${W} ${H}`);
  const g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

  const x=d3.scaleBand().domain(entries.map(e=>e.d)).range([0,w]).padding(0.1);
  const y=d3.scaleLinear().domain([d3.min(entries,e=>e.avgConf)*0.98, 100]).range([h,0]).nice();

  // Grid
  g.append('g').attr('class','d3-grid')
   .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''))
   .select('.domain').remove();

  // Area
  const area=d3.area()
    .x(d=>x(d.d)+x.bandwidth()/2)
    .y0(h).y1(d=>y(d.avgConf))
    .curve(d3.curveMonotoneX);
  g.append('path').datum(entries).attr('fill','rgba(100,150,255,0.1)')
    .attr('stroke','none').attr('d',area);

  // Line
  const line=d3.line()
    .x(d=>x(d.d)+x.bandwidth()/2)
    .y(d=>y(d.avgConf))
    .curve(d3.curveMonotoneX);
  g.append('path').datum(entries).attr('fill','none')
    .attr('stroke','#6699ff').attr('stroke-width',1.8).attr('d',line);

  // Dots
  const tooltip=d3.select(container).append('div').attr('class','d3-tooltip').style('opacity',0).style('position','absolute');
  g.selectAll('circle').data(entries).enter().append('circle')
    .attr('cx',d=>x(d.d)+x.bandwidth()/2).attr('cy',d=>y(d.avgConf))
    .attr('r',3.5).attr('fill','#aac4ff').attr('stroke','#6699ff').attr('stroke-width',1)
    .on('mouseover',(event,d)=>{
      tooltip.style('opacity',1).html(`<strong>${d.d}</strong><br/>Avg Conf: ${d.avgConf.toFixed(1)}%`)
        .style('left',(event.offsetX+10)+'px').style('top',(event.offsetY-28)+'px');
    })
    .on('mouseout',()=>tooltip.style('opacity',0));

  // Axes
  g.append('g').attr('class','d3-axis').attr('transform',`translate(0,${h})`)
   .call(d3.axisBottom(x).tickSize(0))
   .selectAll('text').attr('transform','rotate(-40)').style('text-anchor','end')
   .style('fill','#7788aa').style('font-size','9px');
  g.select('.d3-axis .domain').remove();

  g.append('g').attr('class','d3-axis')
   .call(d3.axisLeft(y).ticks(5).tickFormat(d=>d+'%'))
   .select('.domain').remove();
  g.selectAll('.d3-axis text').style('fill','#7788aa').style('font-size','10px');
}

/** D3 Stacked bar: energy type breakdown per district */
function buildD3StackBar() {
  const container = document.getElementById('d3-stack-bar');
  d3.select(container).selectAll('*').remove();

  const types=['SOLAR','WIND','BIOMASS','HYBRID'];
  const districts=Object.keys(districtStats).sort();
  const data=districts.map(d=>{
    const s=districtStats[d];
    return {district:d, SOLAR:s.counts.SOLAR||0, WIND:s.counts.WIND||0, BIOMASS:s.counts.BIOMASS||0, HYBRID:s.counts.HYBRID||0};
  });

  const stackedData=d3.stack().keys(types)(data);
  const margin={top:14,right:80,bottom:60,left:36};
  const W=Math.max(container.clientWidth||700, districts.length*28);
  const H=300;
  const w=W-margin.left-margin.right, h=H-margin.top-margin.bottom;

  const svgContainer=d3.select(container).append('div').style('overflow-x','auto');
  const svg=svgContainer.append('svg').attr('width',W).attr('height',H);
  const g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

  const x=d3.scaleBand().domain(districts).range([0,w]).padding(0.18);
  const y=d3.scaleLinear().domain([0,d3.max(data,d=>d.SOLAR+d.WIND+d.BIOMASS+d.HYBRID)]).nice().range([h,0]);

  const typeColors={SOLAR:'rgba(255,140,0,0.82)',WIND:'rgba(30,144,255,0.82)',BIOMASS:'rgba(50,205,50,0.82)',HYBRID:'rgba(155,89,182,0.82)'};
  const tooltip=svgContainer.append('div').attr('class','d3-tooltip').style('opacity',0).style('position','absolute');

  stackedData.forEach(layer=>{
    g.selectAll(`.bar-${layer.key}`).data(layer).enter().append('rect')
      .attr('x',d=>x(d.data.district))
      .attr('y',d=>y(d[1]))
      .attr('height',d=>Math.max(0,y(d[0])-y(d[1])))
      .attr('width',x.bandwidth())
      .attr('fill',typeColors[layer.key])
      .attr('rx',2)
      .on('mouseover',(event,d)=>{
        const val=d[1]-d[0];
        tooltip.style('opacity',1)
          .html(`<strong>${d.data.district}</strong><br/>${layer.key}: ${val} blocks`)
          .style('left',(event.offsetX+10)+'px').style('top',(event.offsetY-28)+'px');
      })
      .on('mouseout',()=>tooltip.style('opacity',0));
  });

  // X axis
  g.append('g').attr('class','d3-axis').attr('transform',`translate(0,${h})`)
   .call(d3.axisBottom(x).tickSize(0))
   .selectAll('text').attr('transform','rotate(-40)').style('text-anchor','end')
   .style('fill','#7788aa').style('font-size','9px');
  g.select('.d3-axis .domain').remove();

  // Y axis
  g.append('g').attr('class','d3-axis')
   .call(d3.axisLeft(y).ticks(6))
   .select('.domain').remove();

  // Legend
  const legend=g.append('g').attr('transform',`translate(${w+10},0)`);
  types.forEach((t,i)=>{
    legend.append('rect').attr('x',0).attr('y',i*18).attr('width',12).attr('height',12)
      .attr('fill',typeColors[t]).attr('rx',2);
    legend.append('text').attr('x',16).attr('y',i*18+10)
      .text(t).style('fill','#7788aa').style('font-size','10px').attr('font-family','Inter,sans-serif');
  });
}

// ─────────────────── NEW: Split Map ───────────────────
function initSplitMap() {
  // Init left (District) map if not already
  if (!mapLeft) {
    mapLeft = L.map('map-left',{center:[20.5,84.5],zoom:7,zoomControl:true});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {attribution:'© OpenStreetMap © CARTO',subdomains:'abcd',maxZoom:19}).addTo(mapLeft);
  }
  // Init right (Block) map if not already
  if (!mapRight) {
    mapRight = L.map('map-right',{center:[20.5,84.5],zoom:7,zoomControl:false});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {attribution:'© OpenStreetMap © CARTO',subdomains:'abcd',maxZoom:19}).addTo(mapRight);
  }

  // Sync zoom & pan between maps
  mapLeft.on('moveend', ()=>syncMap(mapLeft, mapRight));
  mapRight.on('moveend', ()=>syncMap(mapRight, mapLeft));

  mapLeft.invalidateSize();
  mapRight.invalidateSize();

  renderSplitLayers();
  renderSplitAgreementBar();
}

function syncMap(source, target) {
  if (splitSyncing) return;
  splitSyncing = true;
  target.setView(source.getCenter(), source.getZoom(), {animate:false});
  splitSyncing = false;
}

function renderSplitLayers() {
  if (!blocksData) return;

  // LEFT: District choropleth
  if (splitLayerLeft) { mapLeft.removeLayer(splitLayerLeft); splitLayerLeft=null; }
  if (districtsData) {
    splitLayerLeft = L.geoJSON(districtsData, {
      style: feature => {
        const d = getDistrictNameFromFeature(feature);
        const stat = d ? districtStats[d] : null;
        if (!stat) return {fillColor:'#1e2d50',fillOpacity:0.6,color:'#4466aa',weight:1.2};
        return {fillColor:COLORS[stat.dominant]||'#1e2d50',fillOpacity:0.7,color:'#1a2035',weight:1};
      },
      onEachFeature: (feature,layer) => {
        const d = getDistrictNameFromFeature(feature);
        const stat = d ? districtStats[d] : null;
        const label = d || 'Unknown';
        const tip = stat
          ? `<strong>${label}</strong><br/><span style="color:${COLORS[stat.dominant]||'#aaa'}">${stat.dominant}</span><br/>${stat.blockCount} blocks`
          : `<strong>${label}</strong>`;
        layer.bindTooltip(tip,{sticky:true,opacity:0.97});
        layer.on('click',()=>{ if(d) syncSplitToDistrict(d); });
      }
    }).addTo(mapLeft);
  }

  // RIGHT: Block choropleth
  if (splitLayerRight) { mapRight.removeLayer(splitLayerRight); splitLayerRight=null; }
  splitLayerRight = L.geoJSON(
    {type:"FeatureCollection",features:blocksData.features},
    {
      style: f => ({
        fillColor:COLORS[getPrediction(f.properties)]||COLORS.UNKNOWN,
        fillOpacity:0.65,
        color:'rgba(0,0,0,0.2)',weight:0.5
      }),
      onEachFeature: (feature,layer) => {
        const p=feature.properties, pred=getPrediction(p), conf=getConfidence(p).toFixed(1);
        layer.bindTooltip(`<strong>${p[COLS.blockName]||''}</strong><br/>${p[COLS.district]||''}<br/><span style="color:${COLORS[pred]||'#aaa'}">${pred}</span> ${conf}%`,{sticky:true,opacity:0.97});
      }
    }
  ).addTo(mapRight);
}

/** When a district is clicked on left split map, zoom both maps in */
function syncSplitToDistrict(districtName) {
  if (!blocksData) return;
  const districtBlocks = blocksData.features.filter(f=>f.properties[COLS.district]===districtName);
  if (districtBlocks.length===0) return;
  const tempLayer = L.geoJSON({type:"FeatureCollection",features:districtBlocks});
  const bounds = tempLayer.getBounds();
  mapLeft.fitBounds(bounds,{padding:[20,20]});
  // mapRight syncs via moveend
}

/** Render agreement color cells in split tab footer */
function renderSplitAgreementBar() {
  const container=document.getElementById('split-agree-cells');
  container.innerHTML='';
  const entries=Object.entries(districtStats).sort((a,b)=>a[0].localeCompare(b[0]));
  entries.forEach(([d,s])=>{
    const agreeClass = parseFloat(s.agreePct)>=80 ? 'agree' : 'disagree';
    const cell=document.createElement('div');
    cell.className=`agree-cell ${agreeClass}`;
    cell.title=`${d}: ${s.agreePct}% agree (${s.maupCount} MAUP)`;
    container.appendChild(cell);
    // Tooltip via title attribute (accessible)
    cell.addEventListener('mouseenter', e=>{
      const tip=document.getElementById('split-cell-tip');
      if(tip){tip.textContent=cell.title;tip.style.display='block';}
    });
  });

  // Add a floating tooltip element for cell hover
  if(!document.getElementById('split-cell-tip')) {
    const tip=document.createElement('span');
    tip.id='split-cell-tip';
    tip.style.cssText='position:absolute;background:rgba(8,12,28,0.96);border:1px solid rgba(100,150,255,0.25);color:#ddeeff;font-size:0.72rem;padding:4px 8px;border-radius:4px;pointer-events:none;display:none;z-index:9999;font-family:Inter,sans-serif;';
    document.body.appendChild(tip);
    document.getElementById('split-agreement-bar').addEventListener('mousemove',e=>{
      tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY-30)+'px';
    });
    document.getElementById('split-agreement-bar').addEventListener('mouseleave',()=>tip.style.display='none');
  }
}

// ─────────────────── Export ───────────────────
function exportCSV() {
  if(!blocksData)return;
  const filtered=getFilteredFeatures();
  if(filtered.length===0){alert("No blocks match current filters.");return;}
  const headers=['block_name','district_n','final_prediction','rf_confidence','cluster','solar_mean','wind_mean','pop_mean','dist_roads_mean','dist_trans_mean','dist_sub_mean','constraint_pct'];
  const rows=filtered.map(f=>{const p=f.properties;return headers.map(h=>{const v=p[h];return v==null?'':(typeof v==='string'&&v.includes(',')?`"${v}"`:v);}).join(',');});
  triggerDownload(new Blob([[headers.join(','),...rows].join('\n')],{type:'text/csv'}),'odisha_energy_filtered.csv');
}

function exportGeoJSON() {
  if(!blocksData)return;
  const filtered=getFilteredFeatures();
  if(filtered.length===0){alert("No blocks match current filters.");return;}
  triggerDownload(new Blob([JSON.stringify({type:"FeatureCollection",features:filtered},null,2)],{type:'application/json'}),'odisha_energy_filtered.geojson');
}

function triggerDownload(blob,filename) {
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─────────────────── Init ───────────────────
document.addEventListener('DOMContentLoaded', function() {
  initMap();
  loadData();
});
