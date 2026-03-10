# Phase 1 — Data Acquisition & Preprocessing

**Lead:** Ashutosh Singh
**Timeline:** January – March 2025 | **Data Sources Visited:** 8 | **Processing Time:** ~80 hours QGIS manual work

All Phase 1 processing was performed **manually in QGIS 3.x** — no automation scripts were used at this stage.

---

## Overview

**Objective:** Collect, download, preprocess, clip, and standardize **25+ geospatial datasets** covering all renewable energy resource potential, terrain, infrastructure, and socio-economic factors relevant to site selection in Odisha.

**Result:** 25+ fully aligned, standardized GIS datasets organized into **4 major categories**:
- Renewable Resource Layers (5 datasets)
- Terrain & Natural Layers (7 datasets)
- Infrastructure Layers (5 datasets)
- Socio-Economic Layers (3+ datasets)

All rasters standardized to **2013 × 2422 pixels, 267m resolution, EPSG:32645 projection** ready for Phase 2 spatial constraint modeling.

---

## 1. Study Area Definition

### Geographic Scope

The renewable energy decision support system targets **Odisha State, India**.

| Property | Value |
|----------|-------|
| **Region** | Odisha (Eastern India) |
| **Purpose** | Renewable energy resource potential analysis & site recommendation |
| **Administrative Units** | 30 districts, 314 revenue blocks |
| **Projection** | EPSG:32645 (UTM Zone 45N) — metric units for accurate slope calculation |
| **Reference Grid** | 267m × 267m pixel resolution (aligned to Global Solar Atlas) |
| **Grid Size** | 2013 × 2422 pixels |

### Why Odisha?

1. **High solar potential** — Mean GHI: 5.1–5.5 kWh/m²/day across state
2. **Wind corridors** — Coastal regions (100m wind speed: 5–6.5 m/s)
3. **Agricultural biomass** — 4M+ hectares cultivable area
4. **Policy support** — Odisha Renewable Energy Policy 2021
5. **Economic opportunity** — Manufacturing hubs in coastal districts

### Data Selection Strategy

All datasets selected on four criteria:

| Criterion | Requirement | Why |
|-----------|------------|-----|
| **Coverage** | Must cover all of Odisha state | Cannot have data gaps |
| **Resolution** | Minimum 100m × 100m pixels | Match Solar Atlas standard |
| **Accuracy** | Verified / peer-reviewed source | Global standards (USGS, Google, UN databases) |
| **Free Access** | No licensing costs | Academic research requirement |

---

## 2. Solar Energy Data Collection

### Dataset 1: PVOUT (Photovoltaic Power Output)

#### What was searched

```
PVOUT solar data India download
PVOUT Photovoltaic potential Odisha
Global solar atlas India PV database
PVOUT annual yield renewable atlas
```

#### Source & Website

**Global Solar Atlas** — https://globalsolaratlas.info

**Why this source:**
- Backed by World Bank & International Finance Corporation
- Verified against ground stations across India
- 250m spatial resolution (global standard)
- Free for research and non-commercial use

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | PVOUT — Photovoltaic Power Output |
| **Format** | GeoTIFF raster |
| **Unit** | kWh/kWp/year |
| **Resolution** | 250m × 250m pixels global |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Geographic Coverage** | Asia (must be clipped to Odisha) |
| **Data Source** | Satellite solar irradiance modeling (Solargis) |

#### What PVOUT Represents

```
PVOUT = Annual electricity output from a 1 kWp (kilowatt-peak) solar panel installation
under average weather conditions at each pixel location
```

**Example interpretation:**
- PVOUT = 1,200 kWh/kWp/year
- Means: A 10 kW solar system produces 12,000 kWh/year on average
- Higher PVOUT = Better solar site

#### Why This Dataset Was Needed

| Reason | Explanation |
|--------|-------------|
| **Direct productivity metric** | PVOUT already accounts for weather patterns, panel angle, dust, etc. |
| **ML feature essential** | Phase 5 used `solar_mean` (mean PVOUT per block) as primary predictor for solar suitability |
| **Engineering relevance** | Project developers directly use PVOUT for financial feasibility studies |
| **Phase 3 weighting** | Weighted at **25% importance in solar suitability formula** |

#### Odisha Statistics (After Clipping)

| Statistic | Value |
|-----------|-------|
| Mean PVOUT | 1,497 kWh/kWp/year |
| Min PVOUT | 1,389 kWh/kWp/year |
| Max PVOUT | 1,568 kWh/kWp/year |
| Std Dev | 28 kWh/kWp/year |
| **Interpretation** | Odisha has relatively uniform solar potential — 80% of pixels within ±50 kWh/kWp/year band |

---

### Dataset 2: GHI (Global Horizontal Irradiance)

#### What was searched

```
GHI solar irradiance India download
Global solar atlas India GHI dataset
solar radiation raster Odisha GIS
Global Horizontal Irradiance World Bank
```

#### Source & Website

**Global Solar Atlas** — https://globalsolaratlas.info

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | GHI — Global Horizontal Irradiance |
| **Format** | GeoTIFF raster |
| **Unit** | kWh/m²/year |
| **Resolution** | 250m × 250m pixels global |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Data source** | Solargis satellite modeling (1994–2020 climatology) |

#### What GHI Represents

```
GHI = Total solar radiation received on a perfectly horizontal surface
over one year at each location (including direct and diffuse radiation)
```

**Example interpretation:**
- GHI = 1,850 kWh/m²/year
- Means: If you collect sunlight on a 1m² horizontal surface for a year, it captures 1,850 kWh

#### Why This Dataset Was Needed

| Reason | Explanation |
|--------|-------------|
| **Raw energy input** | GHI represents fundamental solar resource before conversion losses |
| **Model interpretability** | Helps ML models distinguish true radiation patterns from technology-specific factors in PVOUT |
| **Phase 3 primary factor** | Assigned **35% weight in solar suitability formula** (highest importance) |
| **Complementary to PVOUT** | PVOUT already includes panel efficiency; GHI shows untapped potential |
| **Validation metric** | Checks data quality — GHI should correlate strongly with PVOUT |

#### Odisha Statistics (After Clipping)

| Statistic | Value |
|-----------|-------|
| Mean GHI | 1,988 kWh/m²/year |
| Min GHI | 1,847 kWh/m²/year |
| Max GHI | 2,089 kWh/m²/year |
| Std Dev | 35 kWh/m²/year |
| **Interpretation** | Very uniform solar irradiance across state — indicates shallow seasonal variation |

#### Quality Check Performed

```
Correlation check: GHI vs PVOUT
Expected: r > 0.92 (should move together)
Actual result in Odisha: r = 0.95 ✅

Interpretation: Datasets consistent and reliable
```

---

### Dataset 3: DNI (Direct Normal Irradiance)

#### What was searched

```
DNI direct normal irradiance India download
DNI concentrated solar power CSP Odisha
Direct beam radiation India raster
Direct Normal Irradiance dataset GIS
```

#### Source & Website

**Global Solar Atlas** — https://globalsolaratlas.info

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | DNI — Direct Normal Irradiance |
| **Format** | GeoTIFF raster |
| **Unit** | kWh/m²/year |
| **Resolution** | 250m × 250m pixels global |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Data source** | Solargis satellite modeling |

#### What DNI Represents

```
DNI = Direct solar radiation received perpendicular to the sun's rays
(excluding diffuse sky radiation)
```

**Importance:**
- Essential for **Concentrated Solar Power (CSP)** systems
- Only direct beam radiation can be concentrated with mirrors/lenses
- Different from GHI which includes diffuse radiation

**Example interpretation:**
- DNI = 2,200 kWh/m²/year
- Means: Direct beam only captures 2,200 kWh/m² annually
- Higher DNI = Better for CSP technology

#### Why This Dataset Was Needed

| Reason | Explanation |
|--------|-------------|
| **CSP feasibility** | Concentrated solar requires high DNI to be economically viable |
| **Technology diversity** | Complements PVOUT/GHI for photovoltaic systems |
| **Phase 3 scoring** | Could enable separate CSP suitability analysis |
| **Future scalability** | Identifies regions suitable for both PV and CSP technologies |

#### Odisha Statistics (After Clipping)

| Statistic | Value |
|-----------|-------|
| Mean DNI | 1,654 kWh/m²/year |
| Min DNI | 1,456 kWh/m²/year |
| Max DNI | 1,812 kWh/m²/year |
| Std Dev | 52 kWh/m²/year |
| **Interpretation** | Moderate direct beam radiation — suitable for some CSP applications in coastal districts |

---

## 3. Wind Energy Data Collection

#### What was searched

```
wind speed 100m height India download GIS
global wind atlas India dataset raster
wind resource map 100m hub height Asia
wind power potential Odisha GIS data
```

#### Source & Website

**Global Wind Atlas** — https://globalwindatlas.info

**Why this source:**
- Collaboration between World Bank, Google, IFC, Denmark Technical University
- 100m wind speeds validated against ground meteorological stations
- Standard for wind energy resource assessment globally
- Free for research use

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | Wind Speed at 100m height |
| **Format** | GeoTIFF raster |
| **Unit** | m/s (meters per second) |
| **Resolution** | 100m × 100m pixels (finer than solar data) |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Temporal Resolution** | Annual average (long-term climatology) |

#### Why 100 Meters Hub Height?

Modern utility-scale wind turbines operate at:

| Turbine Class | Hub Height | Rotor Diameter | Power Rating |
|---------------|-----------|-----------------|--------------|
| Small (utility) | 80–90m | 60–70m | 2–3 MW |
| **Medium (standard)** | **100–110m** | **80–100m** | **3–5 MW** |
| Large (offshore) | 120–150m | 150–200m | 10–15 MW |

**100m is the de facto global standard** for onshore wind assessment.

#### What Wind Speed at 100m Represents

```
Annual average wind speed at 100m elevation above ground level.
Represents realistic conditions experienced by modern turbine hubs.
```

**Power relationship (cubic law):**
```
Wind Power ∝ (Wind Speed)³

Double the wind speed = 8× more power!
```

#### Why This Dataset Was Needed

| Reason | Explanation |
|--------|-------------|
| **Primary energy driver** | Wind power output directly depends on wind speed cubed — highly sensitive |
| **Turbine feasibility** | Minimum 5.5 m/s needed for commercial generation |
| **Phase 3 top priority** | Assigned **40% weight in wind suitability formula** (highest single factor) |
| **Phase 5 ML feature** | `wind_mean` confirmed as **most critical feature** in ablation study |
| **Geographic reality** | Only 2 of 314 blocks meet >5.5 m/s threshold (coastal areas) |

#### Odisha Statistics (After Clipping)

| Statistic | Value |
|-----------|-------|
| Mean wind speed | 4.00 m/s |
| Min wind speed | 2.80 m/s (inland) |
| Max wind speed | 6.50 m/s (coastal) |
| Std Dev | 0.82 m/s |
| **Interpretation** | Odisha mostly unsuitable for wind (4 m/s is marginal) except narrow coastal strip |

---

### Dataset 2: Wind Power Density at 100m

#### What was searched

```
wind power density 100m India download
global wind atlas power density raster
wind energy density 100m meters height
wind resource power per square meter India
```

#### Source & Website

**Global Wind Atlas** — https://globalwindatlas.info

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | Wind Power Density at 100m height |
| **Format** | GeoTIFF raster |
| **Unit** | W/m² (watts per square meter) |
| **Resolution** | 100m × 100m pixels |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Temporal Resolution** | Annual average (long-term climatology) |

#### What Wind Power Density Represents

```
Wind Power Density = Available wind energy per unit area
Also known as Wind Resource Density or Wind Power Potential
```

**Physical relationship (cubic dependence):**
```
Power Density ∝ (Wind Speed)³

This is why small wind speed increases = massive power increases
Example:
  5 m/s → ~150 W/m²
  7 m/s → ~450 W/m² (3× higher at only 1.4× wind speed!)
```

#### Why This Dataset Was Needed

| Reason | Explanation |
|--------|-------------|
| **Turbine productivity metric** | Power density directly predicts kWh/year from turbine generator |
| **Economic feasibility** | Developers use W/m² to calculate financial ROI |
| **Complementary to wind speed** | Accounts for air density and turbulence effects beyond just speed |
| **Phase 5 ML feature** | Power density could improve wind suitability predictions |

#### Odisha Statistics (After Clipping)

| Statistic | Value |
|-----------|-------|
| Mean power density | 89 W/m² |
| Min power density | 32 W/m² (inland) |
| Max power density | 278 W/m² (coastal) |
| Std Dev | 48 W/m² |
| **Interpretation** | Very limited wind resource — only coastal districts exceed 150 W/m² (marginal for turbines) |

**Commercial viability threshold: ~200 W/m²** — Only 2-3 blocks meet this criterion.

---

## 4. Biomass Resource Data: Population Density

#### What was searched

```
population density map India download GIS
WorldPop India raster data
population grid 100m resolution India
census data spatial South Asia raster
```

#### Source & Website

**WorldPop** — https://www.worldpop.org

**Why this source:**
- University of Southampton research project
- Official population data source for UN agencies
- 100m resolution grid based on Census 2021 for India
- Free academic license

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | Population Density 2020/2021 |
| **Format** | GeoTIFF raster |
| **Unit** | persons/km² |
| **Resolution** | 100m × 100m pixels |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Source** | Census of India 2011 + 2021 + satellite settlement mapping |
| **NoData value** | -99999.0 (see issues section) |

#### Why Population Density for Biomass?

Biomass energy depends on:

1. **Feedstock availability** → Agricultural areas (correlated with population density)
2. **Demand proximity** → Population centers need biogas / biofuel
3. **Collection infrastructure** → Roads and villages in populated areas

```
High population + agricultural land = Biomass potential
```

#### Odisha Statistics (After Clipping & Cleaning)

| Statistic | Value |
|-----------|-------|
| Mean population density | 404 persons/km² |
| Min (rural areas) | 5 persons/km² |
| Max (urban centers) | 8,900 persons/km² |
| Std Dev | 580 persons/km² |
| **Interpretation** | Mixed urban-rural; biomass concentrated in populated agricultural zones |

---

## 4b. Socio-Economic: Human Settlements & Places

#### What was searched

```
settlements shapefile India download
places points OSM Odisha
villages towns cities Odisha GIS
populated places vector layer
human settlements polygon boundaries
```

#### Source & Website

**OpenStreetMap** — https://www.openstreetmap.org

#### Datasets Downloaded

| Property | Geometry | Count | Purpose |
|----------|----------|-------|---------|
| Places Points | Point | ~5,000+ | Individual settlements, towns, villages |
| Places Polygons | Polygon | ~800+ | Settlement boundaries, urban extent |

#### Dataset Details

| Property | Value |
|----------|-------|
| **Format** | Shapefile (points and polygons) |
| **Classes** | City, town, village, hamlet, neighbourhood |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Coverage** | All human settlements in Odisha |

#### Why Settlement Data Was Needed

| Reason | Explanation |
|--------|-------------|
| **Social compatibility** | Renewable plants too close to settlements → noise/wildlife issues |
| **Visual impact** | Wind turbines visible from settlements (buffer zone social acceptance) |
| **Land acquisition** | Settlements = owned/inhabited land (not available for development) |
| **Infrastructure access** | Settlements identify population centers needing power supply |
| **Phase 2 constraint** | Buffer zones around urban settlements automatically excluded |

#### Buffer Zones Applied

```
Around urban polygons: 1–2 km exclusion buffer
  (local regulations, visual impact, noise)

Around villages: 500 m–1 km exclusion buffer
  (smaller settlements, variable local ordinances)

Assessment: ~6% of Odisha covered by settlement buffers
```

#### Settlement Distribution

Odisha settlements concentrated in:
- **Coastal districts:** Bhubaneswar, Cuttack, Berhampur (high density)
- **Inland industrial zones:** Rourkela, Angul (medium density)
- **Agricultural areas:** Dispersed village pattern (low density)

---

## 5. Environmental Constraints: Protected Areas (WDPA)

#### What was searched

```
protected areas India GIS shapefile download
WDPA World Database Protected Areas India
wildlife sanctuary national park India shapefile
protected planet dataset Odisha WDPA
India environmental conservation GIS
```

#### Source & Website

**Protected Planet** — https://www.protectedplanet.net

**Lead Organization:** UN Environment Programme (UNEP)

**Why this source:**
- Official UN database of all protected areas globally
- Legal compliance required for India development projects
- Vector boundaries verified by national conservation agencies
- Free download for all countries

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | WDPA — World Database of Protected Areas (India subset) |
| **Format** | Shapefile vector polygons (or GeoJSON) |
| **Geometry Type** | Multi-polygon (includes disjoint reserves) |
| **Attribute Fields** | Name, Type, Status, Year_designat, Area, etc. |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Coverage** | National parks, wildlife sanctuaries, biosphere reserves, sacred groves |

#### Why WDPA Data Was Needed

| Reason | Explanation |
|--------|-------------|
| **Legal requirement** | Indian environmental law prohibits industrial projects in protected areas |
| **Ecological conservation** | Protects biodiversity, sacred sites, tribal lands |
| **Phase 2 constraint** | WDPA areas received **1 km exclusion buffer** (highest sensitivity constraint) |
| **Spatial planning** | Used to eliminate ~300+ km² from renewable consideration |

#### Odisha Coverage

| Category | Count | Area |
|----------|-------|------|
| National Parks | 1 | 1,422 km² (Similipal) |
| Wildlife Sanctuaries | 9 | 2,847 km² |
| Biosphere Reserves | 2 | 11,453 km² (overlapping) |
| Ramsar Wetlands | 7 | 923 km² |
| **Total protected area** | **~19** | **~16,600 km²** |
| **% of Odisha** | — | **13.4% of state** |

#### WDPA Points Layer (Protected Area Headquarters)

**Additional dataset:** `wdpa_points_odisha.shp`

| Property | Value |
|----------|-------|
| **Feature type** | Point locations (PA headquarters, checkpoints) |
| **Count** | ~50–100 protected area administrative points |
| **Use case** | Identify PA management centers for enforcement proximity |

**Why points are useful:**
```
Polygons = conservation zones (static legal boundaries)
Points = administrative centers (enforcement capacity locations)

Distance-to-PA-point metric indicates enforcement proximity:
  - Near PA point: Higher surveillance/restriction risk
  - Far from PA point: Lower enforcement pressure

Combined with polygon buffers for comprehensive legal compliance
```

---

## 6. Additional Constraint & Infrastructure Data

### DEM (Digital Elevation Model) — Terrain Analysis

#### Dataset

| Property | Value |
|----------|-------|
| **Source** | SRTM 1 Arc-Second (USGS) OR Copernicus 30m |
| **Unit** | meters above sea level |
| **Resolution** | 30m × 30m pixels (upsampled to 267m in analysis) |
| **Use Case** | Slope calculation for terrain constraint |

#### Why Slope Matters

```
Slope > 10°: Physically impossible for solar panel installation,
wind turbine foundation, or biomass collection

Slope 0-10°: Acceptable
Slope >10°: EXCLUDED from renewable energy siting
```

#### Odisha Statistics

| Statistic | Value |
|-----------|-------|
| Mean slope | 6.51° |
| Max slope | 31.2° |
| % area > 10° | 3.2% (excluded) |
| **Interpretation** | Mostly flat state; slope not a major constraint |

---

### Aspect Layer (Terrain Direction)

#### Dataset

| Property | Value |
|----------|-------|
| **Derived from** | Digital Elevation Model (DEM) |
| **Format** | GeoTIFF raster |
| **Unit** | Degrees (0–360°; also categorical: N, NE, E, SE, S, SW, W, NW) |
| **Resolution** | 30m × 30m pixels (upsampled to 267m in analysis) |
| **Use Case** | Solar panel orientation optimization |

#### What Aspect Represents

```
Aspect = Compass direction that terrain slope faces
Measured in degrees from North (0°/360°) clockwise:
  0° / 360° = North
  90° = East
  180° = South
  270° = West
```

#### Why Aspect Matters for Solar

```
In Northern Hemisphere (Odisha at 20°N latitude):
  South-facing slopes: Receive maximum solar radiation
  North-facing slopes: Receive minimal radiation

Solar panels ideally oriented toward 180° (South)
Deviations from optimal aspect reduce panel efficiency
```

#### Odisha Aspect Statistics

| Aspect Direction | % of Odisha | Suitability |
|------------------|-----------|------------|
| South (150°–210°) | 28% | **Excellent** for solar |
| Southwest (180°–270°) | 22% | **Very Good** |
| Southeast (90°–180°) | 18% | **Good** |
| Other aspects | 32% | Suboptimal |

#### Why This Dataset Was Needed

| Reason | Explanation |
|--------|-------------|
| **Panel efficiency** | Optimal orientation increases annual yield by 10–15% |
| **Fine-grained suitability** | Phase 3 could weight south-facing slopes more favorably |
| **Geographic intelligence** | Terrain morphology drives local renewable patterns |

---

### Dynamic World Land Cover (10m Resolution)

#### What was searched

```
dynamic world land cover 10m India download
Google Earth Engine land use classification
high resolution land cover Odisha GIS
settlement building agriculture forest water
```

#### Source & Website

**Google Earth Engine — Dynamic World Dataset**

Website: https://www.dynamicworld.app

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | Dynamic World Land Cover |
| **Format** | GeoTIFF raster |
| **Resolution** | 10m × 10m pixels globally (fine detail) |
| **Projection** | WGS84 (EPSG:4326) — geographic |
| **Classification** | 9 land cover classes |
| **Update frequency** | Monthly (near-real-time satellite monitoring) |
| **Source** | Sentinel-2 satellite imagery (ESA) |

#### Land Cover Classes

| Class | Description | Code |
|-------|-------------|------|
| Water | Rivers, lakes, reservoirs | 0 |
| Trees | Forests, dense vegetation | 1 |
| Grass | Grasslands, margins, young growth | 2 |
| Flooded vegetation | Wetlands, mangroves, seasonally flooded | 3 |
| Crops | Agricultural fields | 4 |
| Shrub | Scrubland, sparse vegetation | 5 |
| Built-up | Urban, Settlements, buildings | 6 |
| Bare ground | Rock, soil, bare land | 7 |
| Snow | Snow cover (minimal in Odisha) | 8 |

#### Why This Dataset Was Needed

| Reason | Explanation |
|--------|-------------|
| **Multiple constraints** | Different land cover types have different suitability scores |
| **Fine resolution (10m)** | Captures detailed agricultural patterns and urban boundaries |
| **High accuracy** | ML-based classification (better than manual mapping) |
| **Phase 2 constraint** | Urban/built-up areas automatically excluded from renewable siting |
| **Phase 3 differentiation** | Biomass suitability differs between cropland vs. grassland vs. shrubland |
| **Environmental compliance** | Protected vegetation (trees, wetlands) identified for buffer zones |

#### Odisha Coverage (Typical Distribution)

| Class | % of Odisha | Renewable Potential |
|-------|-----------|-------------------|
| Crops | 52% | **BIOMASS potential** |
| Water bodies | 8% | **EXCLUDED (buffer zones)** |
| Trees/Forest | 22% | **Protected/Conservation** |
| Built-up | 6% | **EXCLUDED (densely populated)** |
| Grassland | 8% | **SOLAR/WIND potential** |
| Bare ground | 4% | **High SOLAR/WIND potential** |

---

### Water Bodies (Vector Polygons)

#### Dataset

| Property | Value |
|----------|-------|
| **Source** | OpenStreetMap (https://www.openstreetmap.org) |
| **Format** | Shapefile polygon layer |
| **Feature types** | Lakes, reservoirs, major rivers, ponds |
| **Coverage** | Permanent and seasonal water bodies |

#### Why Excluded from Renewable Siting

```
Water bodies require:
  - Riparian buffer zones (ecological protection)
  - Flood risk assessment
  - Avoided for panel/turbine installation
  - Environmental compliance (water act regulations)
```

#### Processing

```
Buffer zone applied: 500 meters around all water features
Buffered areas excluded from renewable siting constraint map
```

---

### Infrastructure Data (Distance Layers)

Three key infrastructure distance datasets created:

| Dataset | Why Important | Unit |
|---------|--------------|------|
| **Distance to Roads** | Access for construction & maintenance | km |
| **Distance to Transmission Lines** | Grid connection cost | km |
| **Distance to Electrical Substations** | Power evacuation feasibility | km |

**Format:** Shapefile vector lines/points → Converted to distance rasters

**Processing method:**
```
QGIS Raster → Analysis → Proximity (Raster Distance)
```

---

### Railway Lines & Transport Infrastructure

#### What was searched

```
railway lines India shapefile download
rail network Odisha GIS OSM
transport infrastructure Odisha shapefiles
railway tracks vector data India
```

#### Source & Website

**OpenStreetMap** — https://geofabrik.de

#### Dataset Downloaded

| Property | Value |
|----------|-------|
| **Dataset** | Railway Lines & Transport Infrastructure |
| **Format** | Shapefile line layer |
| **Feature types** | Railway tracks, major transport corridors |
| **Purpose** | Industrial access and material transport |

#### Why Railway Data Was Needed

| Reason | Explanation |
|--------|-------------|
| **Industrial logistics** | Heavy equipment transportation via rail |
| **Economic feasibility** | Reduced transport costs for mega renewable installations |
| **Phase 2 opportunity** | Areas near railways receive bonus accessibility score |
| **Infrastructure synergy** | Renewable plants often co-locate with industrial zones |

#### Distance Processing

```
Distance-to-railway raster created (similar to roads/transmission)
Proximity analysis: QGIS → Raster → Analysis → Proximity
Output: dist_railways_utm.tif (distance in meters to nearest rail line)
```

---

## 7. Boundary Data

### Odisha State Boundary

| Property | Value |
|----------|-------|
| **Source** | GADM Level 1 (https://gadm.org) |
| **Use** | Clipping mask for all rasters |
| **Format** | Shapefile polygon |

### District Boundaries (30 units)

| Property | Value |
|----------|-------|
| **Source** | GADM Level 2 |
| **Administrative divisions** | 30 districts |
| **Use** | Phase 4 district-level aggregation |
| **Format** | Shapefile |

### Block Boundaries (314 units)

| Property | Value |
|----------|-------|
| **Source** | Official Census of India 2021 |
| **File** | `Odisha_Admin_Block_BND_2021.shp` |
| **Administrative divisions** | 314 revenue blocks |
| **Use** | Phase 4/5 ML training & prediction |
| **Format** | Shapefile |

---

## 8. Complete Datasets Summary Table (25+ Datasets)

| # | Dataset Name | Source | Format | Resolution | Unit | Downloaded |
|---|--------------|--------|--------|-----------|------|-----------|
| **SOLAR RESOURCE LAYERS** |
| 1 | PVOUT — PV Power Output | Global Solar Atlas | Raster | 250m | kWh/kWp/yr | ✅ |
| 2 | GHI — Global Horizontal Irradiance | Global Solar Atlas | Raster | 250m | kWh/m²/yr | ✅ |
| 3 | DNI — Direct Normal Irradiance | Global Solar Atlas | Raster | 250m | kWh/m²/yr | ✅ |
| **WIND RESOURCE LAYERS** |
| 4 | Wind Speed at 100m height | Global Wind Atlas | Raster | 100m | m/s | ✅ |
| 5 | Wind Power Density at 100m | Global Wind Atlas | Raster | 100m | W/m² | ✅ |
| **TERRAIN & NATURAL LAYERS** |
| 6 | DEM — Digital Elevation | USGS SRTM | Raster | 30m | meters | ✅ |
| 7 | Slope (derived from DEM) | SRTM | Raster | 30m | degrees | ✅ |
| 8 | Aspect (derived from DEM) | SRTM | Raster | 30m | degrees (N/S/E/W) | ✅ |
| 9 | Dynamic World Land Cover (10m) | Google Earth Engine | Raster | 10m | 9-class classification | ✅ |
| 10 | Water Bodies | OpenStreetMap | Vector | — | polygons | ✅ |
| 11 | WDPA Protected Areas (Polygons) | Protected Planet | Vector | — | polygons | ✅ |
| 12 | WDPA Points (PA Headquarters) | Protected Planet | Vector | — | points (~50–100) | ✅ |
| **INFRASTRUCTURE LAYERS** |
| 13 | Roads & Highways | OpenStreetMap | Vector | — | lines | ✅ |
| 14 | Railway Lines | OpenStreetMap | Vector | — | lines | ✅ |
| 15 | Transmission Lines | OpenStreetMap | Vector | — | lines | ✅ |
| 16 | Electrical Substations | OpenStreetMap | Vector | — | points | ✅ |
| 17 | Transport Infrastructure | OpenStreetMap | Vector | — | mixed | ✅ |
| **SOCIO-ECONOMIC LAYERS** |
| 18 | Population Density (100m) | WorldPop 2021 | Raster | 100m | persons/km² | ✅ |
| 19 | Settlements — Points Layer | OpenStreetMap | Vector | — | points (~5,000+) | ✅ |
| 20 | Settlements — Polygons Layer | OpenStreetMap | Vector | — | polygons (~800+) | ✅ |
| **ADMINISTRATIVE BOUNDARIES** |
| 21 | Odisha State Boundary | GADM Level 1 | Vector | — | polygon (1) | ✅ |
| 22 | District Boundaries | GADM Level 2 | Vector | — | polygons (30) | ✅ |
| 23 | Block Boundaries | Census of India 2021 | Vector | — | polygons (314) | ✅ |
| **DERIVED LAYERS (Created during Phase 1 processing)** |
| 24 | Distance to Roads (raster) | Derived | Raster | 267m | meters | ✅ |
| 25 | Distance to Transmission (raster) | Derived | Raster | 267m | meters | ✅ |
| 26 | Distance to Substations (raster) | Derived | Raster | 267m | meters | ✅ |

**Total Datasets:** 26 raw datasets + derived distance layers = **30+ total GIS layers**

---

## 9. GIS Processing Workflow in QGIS

### Step 1: Import All Datasets

```
QGIS Layers Panel → Import all 14 datasets
Visual inspection for:
  - Geographic extent
  - Data type (raster vs vector)
  - Projection (must standardize)
  - Completeness (missing values, gaps)
```

### Step 2: Check Projections

**Initial state:** Most datasets in WGS84 (EPSG:4326 — geographic)

**Problem with geographic projection:**
- Degree-based coordinates (latitude/longitude)
- Slope calculations impossible (1° longitude ≠ 111 km at equator)
- Distances measured in fractional degrees
- Not suitable for physical measurements

**Solution:** Reproject all layers to **EPSG:32645 (UTM Zone 45N)**

| Property | UTM Zone 45N |
|----------|--------------|
| **Type** | Universal Transverse Mercator — metric projection |
| **Units** | meters (not degrees) |
| **Coverage** | 72°–78°E longitude (includes Odisha) |
| **Accuracy** | True distances in east-west direction |
| **Distortion** | <0.1% across Odisha (acceptable) |

```
QGIS: Raster → Projections → Warp (Reproject)
Select: EPSG:32645 as target
```

### Step 3: Standardize Grid Resolution

**Challenge:** Input rasters at different resolutions:
- Solar rasters: 250m
- Wind: 100m
- Population: 100m
- DEM: 30m

**Solution:** Resample all to **267m × 267m** (lowest common resolution for analysis)

**Why 267m?**
```
267m × 267m = 71,289 m² per pixel ≈ 7.13 hectares
Good balance between:
  - Detail (finer than 1 km blocks)
  - Computational efficiency
  - Noise reduction from satellite data
  - Alignment with Global Solar Atlas standard
```

**Processing:**
```
QGIS: Raster → Projections → Warp
Set output resolution: 267m × 267m
All rasters → UTM 32645 projection
```

### Step 4: Clip All Layers to Odisha Boundary

**Tool:** `QGIS Raster → Extraction → Clip Raster by Mask Layer`

```
For each raster:
  Mask layer: Odisha_boundary.shp
  Output: [name]_odisha.tif

Result: All rasters cropped to state extent
```

**Before clipping:** 10,000+ km² extra coverage (Asia/global)
**After clipping:** Odisha only (156,000 km²)

**Benefits:**
- 90% file size reduction
- Faster processing
- No interference from data outside study area

### Step 5: Align All Rasters to Reference Grid

**Problem found:** After resampling, rasters had different:
- Origins (upper-left corner positions)
- Extents (right/bottom boundaries)
- Pixel alignments

**Solution:** Convert each raster to **reference grid geometry**

**Reference raster:** `pvout_utm.tif` (solar atlas official)
- Shape: **2013 × 2422 pixels**
- Origin: Odisha NW corner (UTM coords)

**Processing for each raster:**
```
QGIS: Raster → Align Rasters
Reference grid: pvout_utm.tif
All other rasters → snap to this geometry
```

**Result:** All 14 rasters now perfectly aligned
```
Shape: 2013 × 2422 pixels (identical)
Projection: EPSG:32645
Resolution: 267m × 267m
Pixel alignment: Perfect overlap
Each pixel position corresponds across all layers
```

---

## Step 6: UTM Projection Conversion & Distance Layer Derivation

### Challenge

After clipping, alignment, and resampling in WGS84... to perform **distance calculations** (which form the basis of Phase 2 and Phase 3 analysis), we needed **metric projections**.

Distance calculations in geographic (WGS84) coordinates:
```
1 degree latitude = ~111 km everywhere
1 degree longitude = ~111 km at equator, 0 km at poles

Cannot use degree-based differences for accurate distances
```

### Solution: Convert to UTM Zone 45N

**Tool:** `QGIS Raster → Projections → Warp (Reproject)`

```
Target projection: EPSG:32645 (UTM Zone 45N)
Output resolution: 267m × 267m (maintain consistency)
Resampling method: bilinear (for continuous data like elevation)
```

**Result:** All rasters reprojected to UTM:
```
pvout_utm.tif
ghi_utm.tif
wind_utm.tif
population_utm.tif
dem_utm.tif
slope_utm.tif
aspect_utm.tif
dw_landcover_utm.tif
(and all others...)
```

### Distance Layer Derivation

From vector layers (roads, transmission, substations, railways), created distance rasters:

**Tool:** `QGIS Raster → Analysis → Proximity (Raster Distance)`

```
Input: roads_odisha.shp (vector lines)
Output: dist_roads_utm.tif (distance raster - UTM projection)
Each pixel = distance in meters to nearest road
```

```
Input: transmission_lines_odisha.shp
Output: dist_transmission_utm.tif

Input: substations_odisha.shp
Output: dist_substations_utm.tif

Input: railways_odisha.shp
Output: dist_railways_utm.tif
```

**These distance rasters became critical Phase 3 cost factors:**
- Shorter distance to roads → lower construction cost proxy
- Shorter distance to transmission → lower grid connection cost
- Shorter distance to substations → better grid integration

---

## 11. Vector-to-Raster Conversion: WDPA

### Challenge

WDPA = **vector (polygon) format**

But Phase 2 & 3 analysis needed **raster format** for:
- Mathematical overlay operations
- Raster Calculator in QGIS
- Zonal statistics in Phase 4

### Solution: Rasterization

**Tool:** `QGIS Raster → Conversion → Rasterize (Vector to Raster)`

**Configuration:**
```
Input layer: WDPA_polygons.shp
Attribute field: (none — burn value)
Burn value: 1
NoData value: 0
Output resolution: 267m × 267m
Output projection: EPSG:32645
Reference extent: pvout_utm.tif shape
```

**Output:** `protected_areas_raster.tif`

```
Pixel values:
  1 = protected area (exclude)
  0 = non-protected (allow)
```

---

## 12. Issues Encountered & Fixes

### Issue 1: DEM Slope Calculation Error ⚠️ **CRITICAL BUG**

#### Problem Discovered

Initial slope calculation produced impossible values:

```
Mean slope in Odisha: 87.94°  ← IMPOSSIBLE
(terrain would be nearly vertical cliffs everywhere)
```

#### Root Cause

Slope was calculated in **WGS84 geographic coordinates** (EPSG:4326):

```
Geographic projection:
  X-axis (longitude): 1° varies from 60 km (at equator) to 0 km (at poles)
  Y-axis (latitude): Fixed at ~111 km per degree

When using degrees as input to slope formula:
  slope = arctan(ΔZ / Δhoriz-distance)

With mixed units (meters vs fractional degrees):
  Result is mathematically meaningless
```

#### Solution

Reproject DEM to **UTM Zone 45N** FIRST, then calculate slope:

```
Step 1: Reproject DEM to EPSG:32645 (metric units — meters)
Step 2: QGIS Raster → Analysis → Slope
        Now using consistent units: meters in all directions

Result: Mean slope = 6.51°  ✅ CORRECT
```

#### Verification

```
Sanity check: Does 6.51° slope match Odisha geography?
- Odisha is mostly coastal plains + Eastern Ghats foothills
- Known topography: very flat in most areas
- 6.51° mean = appropriate ✅

If this had remained 87.94°:
  → Would exclude 99% of Odisha as unsuitable
  → Entire renewable energy analysis invalidated
  → Would have propagated to Phase 2 constraint map
  → ML models trained on wrong data (Phase 5)
```

---

### Issue 2: WDPA Raster Value Problem

#### Problem Discovered

After initial rasterization, checking raster statistics:

```
Band 1 Statistics:
  Min: 1
  Max: 1
  Std Dev: 0

Interpretation: ENTIRE RASTER = 1 everywhere
```

This meant WDPA appeared to cover the entire state (obviously wrong).

#### Root Cause

QGIS rasterization with default settings:
- Burned value = 1 for all polygons
- But NoData was also set to 0
- Raster Calculator later silent-failed when using 0 as NoData

#### Solution 1: Fix NoData Convention

Rasterize WDPA again with proper NoData:

```
QGIS: Raster → Conversion → Rasterize
  Burn value: 1 (protected)
  NoData value: -9999  ← Set explicitly
  Initialization: -9999 (pre-fill entire raster)
```

#### Solution 2: Verify Output

```
Check statistics:
  Min: -9999 (NoData regions)
  Max: 1 (protected areas)
  Mode: -9999 (most of state)

Expected: ~13% pixels = 1, ~87% = -9999 ✅

Verify visually in QGIS:
  Overlay with Odisha boundary
  Protected areas should show as patches (national parks, sanctuaries) ✓
```

---

### Issue 3: Population Density NoData Encoding

#### Problem Discovered

WorldPop data used strange NoData convention:

```
Standard NoData value: NaN (IEEE floating point Not-a-Number)
WorldPop NoData value: -99999.0  (regular negative number)
```

When extracting block-level statistics in Phase 4:

```
If block contained any -99999 pixels:
  mean() function would compute:
  block_mean = (-99999 + 405 + 410 + ...) / num_pixels

Result: Negative mean density (nonsensical)
```

#### Solution

Filter all pixels > 0 before computing mean:

```python
# Phase 4 zonal statistics (Python pseudocode)
for each block:
  pixels = extract all population values in block
  valid_pixels = [p for p in pixels if p > 0]  # Filter
  block_mean = mean(valid_pixels)
```

---

### Issue 4: Raster Shape Mismatch (Phase 4)

#### Problem Discovered

During Phase 4 block-level feature extraction:

```
Reference raster (solar): 2013 × 2422 pixels
Distance rasters: 2012 × 2421 pixels  (shifted by 1 pixel)
```

When attempting zonal statistics:
```
ERROR: Shape mismatch in rasterio
```

#### Root Cause

Four distance layers (roads, transmission, substations) had been resampled separately and lost alignment with reference grid.

#### Solution

Realign all four distance rasters:

```
QGIS: Raster → Align Rasters
Reference: solar_utm.tif (2013 × 2422)
Input: [dist_roads.tif, dist_trans.tif, dist_sub.tif, dist_water.tif]

Output:
  All four now: 2013 × 2422 pixels
  Perfectly aligned to solar_utm
  Ready for Phase 4 zonal statistics
```

---

## 13. Final Standardized Raster Grid

After all processing, Phase 1 produced **14 fully aligned, standardized rasters:**

| Layer | Projection | Resolution | Shape | Extent |
|-------|-----------|-----------|-------|--------|
| pvout_utm.tif | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |
| ghi_utm.tif | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |
| wind100_utm.tif | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |
| dem_slope_utm.tif | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |
| population_utm.tif | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |
| *(distance layers)* | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |
| protected_areas_utm.tif | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |
| *(all others)* | EPSG:32645 | 267m | 2013×2422 | Odisha + buffer |

---

## 14. Phase 1 Outputs

### Raster Datasets Created

| Output File | Source | Data Type | Usage |
|-------------|--------|-----------|-------|
| pvout_utm.tif | Global Solar Atlas | Solar potential (kWh/kWp/yr) | Phase 3, 5 |
| ghi_utm.tif | Global Solar Atlas | Solar irradiance (kWh/m²/yr) | Phase 3, 5 |
| wind100_utm.tif | Global Wind Atlas | Wind speed (m/s) | Phase 3, 5 |
| dem_utm.tif | USRTM | Elevation (meters) | Phase 2 slope calc |
| slope_utm.tif | Derived from DEM | Slope (degrees) | Phase 2 constraint |
| population_utm.tif | WorldPop 2021 | Population density (persons/km²) | Phase 3, 5 |
| distance_roads_utm.tif | OSM | Distance to roads (meters) | Phase 3 |
| distance_transmission_utm.tif | OSM | Distance to transmission (meters) | Phase 3 |
| distance_substations_utm.tif | OSM | Distance to substations (meters) | Phase 3 |
| protected_areas_utm.tif | WDPA | Protected area mask (1/0) | Phase 2, 3 |

### Vector Datasets

| Output File | Description | Features |
|-------------|-------------|----------|
| Odisha_boundary_utm.shp | State boundary | 1 polygon |
| Districts_30_utm.shp | District boundaries | 30 polygons |
| Blocks_314_utm.shp | Block boundaries | 314 polygons |
| Infrastructure_utm.shp | Roads, transmission, substations | Multiple features |

### Documentation & Metadata

```
All rasters documented with:
  - Projection: EPSG:32645 (UTM Zone 45N)
  - Resolution: 267m × 267m
  - Shape: 2013 × 2422 pixels
  - NoData: -9999 or explicitly defined
  - Statistics: min, max, mean, std dev recorded
```

---

## 15. Key Research Insights from Phase 1

### Question 1: District vs. Block vs. Tehsil Scale?

During Phase 1, we debated optimal spatial scale for ML analysis:

| Scale | Samples | Decision | Reason |
|-------|---------|----------|--------|
| **District** | 30 | ❌ Too small | Insufficient for 5-fold cross-validation |
| **Block** | 314 | ✅ **SELECTED** | Statistically valid training set size |
| **Tehsil** | ~6,950 | ❌ Too granular | Spatial autocorrelation, raster noise |

**Conclusion:** Block level (314 units) provides optimal balance between spatial detail and statistical rigor.

---

### Question 2: Why Such Uniform Solar Irradiance?

Expected: GHI varies significantly across Odisha (coast vs. inland).

Observed: GHI standard deviation only 35 kWh/m²/year (1.8% variation)

**Explanation:**
```
Odisha at ~20°N latitude
- Equatorial location = consistent solar elevation angle year-round
- Monsoon patterns create large clouds but averaged over year
- Coastal vs inland differences cancel out in annual average
- Result: Remarkably uniform solar potential across state
```

**Implication for Phase 3:** Solar suitability classification had to switch from **fixed thresholds** to **percentile-based** (68% of pixels fell into single category with fixed thresholds).

---

### Question 3: Wind Potential Severely Limited

Expected: Coastal Odisha should have decent wind resource.

Observed: Only 2 of 314 blocks exceed 5.5 m/s minimum threshold.

**Explanation:**
```
100m average wind speed = 4.0 m/s across Odisha
Utility-scale turbines need ≥ 5.5 m/s for economic operation

Only narrow coastal strip (Bhadrakh, Balasore districts) reaches 5.5+ m/s
90% of state unsuitable for wind energy
```

**Impact on Phase 5:** ML predictions: 250 blocks SOLAR, 62 blocks HYBRID, **only 2 blocks WIND**.

---

## 16. Quality Assurance Checklist

| Check | Result | Status |
|-------|--------|--------|
| All 14 datasets downloaded | ✅ | PASS |
| All projections verified (EPSG:32645) | ✅ | PASS |
| All resolutions standardized (267m) | ✅ | PASS |
| All rasters aligned to reference grid | ✅ | PASS |
| Slope calculation in metric projection | ✅ | FIX APPLIED |
| WDPA rasterization validated | ✅ | FIX APPLIED |
| Population NoData filtering | ✅ | FIX APPLIED |
| Shape alignment verification | ✅ | FIX APPLIED |
| Metadata complete for all 14 rasters | ✅ | PASS |
| Visual inspection in QGIS | ✅ | PASS |
| Ready for Phase 2 processing | ✅ | **APPROVED** |

---

## 17. Phase 1 Timeline & Effort

| Task | Duration | Status |
|------|----------|--------|
| Research & identify data sources | 1 week | ✅ |
| Download all 14 datasets | 3 days | ✅ |
| Initial QGIS inspection | 2 days | ✅ |
| Projection standardization | 3 days | ✅ |
| Resolution resampling | 2 days | ✅ |
| Raster alignment | 2 days | ✅ |
| WDPA vector-to-raster conversion | 1 day | ✅ |
| Error debugging & fixes | 5 days | ✅ |
| Final QA & documentation | 2 days | ✅ |
| **Total** | **~22 days** (80 hours QGIS work) | **COMPLETE** |

---

## 18. Files in This Directory

```
phase1/
├── README.md                  ← Comprehensive Phase 1 documentation (this file)
└── data/
    ├── districts.geojson      ← 30 Odisha district boundaries
    └── infrastructure.rar      ← Roads, substations, transmission, rail layers
```

**Note on Raw Data:** Processed raster files (.tif, .gpkg) are not included in GitHub due to size limits (>100MB each). All processing is reproducible using the QGIS workflow documented above.

---

## ✅ Phase 1 Complete

All 14 datasets standardized, aligned, and ready for **Phase 2 spatial constraint modeling**.

**Next:** Continue to [Phase 2 README](../phase2/README.md)
