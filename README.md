[![Status](https://img.shields.io/badge/status-Phase%206%20Complete-success.svg)](https://github.com/AshutoshSinghJ/renewable-energy-dss-odisha)
# 🌿 Multi-Resource Renewable Energy Potential Mapping
## ML-Based Decision Support System | Odisha, India

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-orange.svg)](https://scikit-learn.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-red.svg)](https://xgboost.readthedocs.io/)
[![QGIS](https://img.shields.io/badge/QGIS-3.x-green.svg)](https://qgis.org/)
[![Status](https://img.shields.io/badge/status-Phase%206%20Complete-success.svg)](https://github.com/AshutoshSinghJ/renewable-energy-dss-odisha)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🚀 Live Deployment

* 🌐 Web App (Vercel): Coming Soon
* 📊 **GitHub Pages (Static Dashboard): [Live →](https://ashutoshsinghj.github.io/renewable-energy-dss-odisha/)**

---

## 📋 Overview

A comprehensive **6-phase geospatial machine learning pipeline** for optimal renewable energy site selection across **Odisha, India**. This system integrates 14 real spatial datasets, GIS-based constraint modeling, Multi-Criteria Decision Analysis (MCDA), and an advanced ML framework to generate actionable suitability maps for **Solar**, **Wind**, and **Biomass** energy installations at **block-level resolution across 314 administrative units**.

**Key Innovation:** Multi-model ML framework combining unsupervised K-Means spatial clustering, supervised Random Forest classification, XGBoost cross-validation, Analytical Hierarchy Process (AHP) expert knowledge integration — with SHAP explainability and GridSearchCV hyperparameter optimization.

> ⚠️ **Note on Raw Data:** Raster files (.tif, .gpkg >100MB each) are not hosted in this repository due to GitHub size limits. Processed archives (.rar), CSVs, GeoJSONs, and all Python scripts are included. Contact the project lead for raw raster access.

---

## 👥 Team Roles & Contributions

| Member | Role | Contribution |
|--------|------|--------------|
| **Ashutosh Singh** | **Project Lead, System Architect & ML Engineer** | Complete project planning and system design, Phase 1 data collection and QGIS implementation, Phase 4 block-level upgrade (314 blocks), coordination across all 6 phases. Explored and identified suitable ML models and guided model selection strategy. |
| **Aryan Singh** | GIS Developer & ML Engineer | Phase 2 spatial constraint modeling and buffer analysis. Assisted in ML model understanding, evaluation, and selection support. |
| **Keshav** | GIS Analyst | Phase 3 MCDA suitability scoring and raster processing |
| **Astitva Tripathi** | GIS / Data Processing | Phase 4 district-level zonal statistics and initial feature extraction (30 districts) |
| **Divyanshu Puri** | ML Engineer & GIS Developer | Phase 5 complete ML pipeline — K-Means, Random Forest, XGBoost, SHAP |
| **Madhusudhan** | Data Processing / GIS Developer | Phase 6 DSS visualization and web output |

### 🔧 Technical Contributions

| Technical Area | Contributor |
|----------------|-------------|
| Project Architecture & Phase Workflow Design | Ashutosh Singh |
| Phase 1 — Data Collection & QGIS Preprocessing | Ashutosh Singh |
| Phase 2 — Constraint Mapping (QGIS) | Aryan Singh |
| Phase 3 — MCDA Suitability Modeling | Keshav |
| Phase 4 — District-Level Feature Extraction (30 units) | Astitva Tripathi |
| Phase 4 — Block-Level Upgrade (314 units) | Ashutosh Singh |
| Phase 5 — ML Pipeline & Model Training | Divyanshu Puri |
| Phase 6 — Web DSS & Visualization | Madhusudhan |
| Machine Learning Model Design | Divyanshu Puri |
| ML Model Research & Selection Strategy | Ashutosh Singh |
| ML Model Support & Evaluation Assistance | Aryan Singh |
| UI / Web Dashboard |Madhusudhan|

---

## 📊 The 6-Phase Methodology

---

### Phase 1: Data Acquisition & Preprocessing ✅
**Lead:** Ashutosh Singh

**Objective:** Assemble, clip, reproject, and align 14 geospatial datasets covering all factors relevant to renewable energy siting in Odisha. All processing performed manually in QGIS 3.x.

#### Datasets Collected (14 Total)

| # | Dataset | Source | Used For |
|---|---------|--------|----------|
| 1 | GHI — Global Horizontal Irradiance | Global Solar Atlas | Solar radiation measurement |
| 2 | PVout — PV Power Output | Global Solar Atlas | Solar electricity productivity |
| 3 | Wind Speed at 100m height | Global Wind Atlas | Wind turbine feasibility |
| 4 | DEM — Digital Elevation Model | SRTM / Copernicus | Slope and terrain filtering |
| 5 | WDPA Protected Areas | protectedplanet.net | Legal exclusion zones |
| 6 | Water Bodies | OpenStreetMap | Buffer constraint zones |
| 7 | Roads and Highways | OpenStreetMap | Infrastructure proximity |
| 8 | Transmission Lines | OpenStreetMap | Grid connection cost proxy |
| 9 | Electrical Substations | OpenStreetMap | Grid connection points |
| 10 | Population Density | WorldPop 2020 | Biomass demand proxy |
| 11 | Land Cover | Dynamic World (Google Earth Engine) | Biomass scoring |
| 12 | Odisha State Boundary | GADM Level 1 | Study area clipping |
| 13 | District Boundaries | GADM Level 2 (30 districts) | District-level aggregation |
| 14 | Block Boundaries | Census of India 2021 (Official) | Block-level ML analysis |

#### Processing Steps
- All 14 rasters clipped to Odisha state boundary
- All layers reprojected to **EPSG:32645** (UTM Zone 45N — metric units)
- Reference grid standardized to **267m × 267m** pixel resolution
- All rasters aligned to reference grid shape **(2013 × 2422 pixels)**

#### ⚠️ Critical Bug Caught and Fixed (Project Lead)
> DEM slope was initially calculated in geographic coordinates (WGS84), producing an impossible mean slope of **87.94°**. Fixed by reprojecting DEM to UTM Zone 45N first, then computing slope — correct result: **6.51° mean slope**. Uncorrected, this would have invalidated the entire constraint map.

---

### Phase 2: Spatial Constraint Modeling ✅
**Lead:** Aryan Singh

**Objective:** Create a binary constraint map identifying all locations legally prohibited or physically unsuitable for energy infrastructure. All processing performed manually in QGIS 3.x.

#### Constraints Applied

| Constraint | Rule | Justification |
|-----------|------|---------------|
| Terrain Slope | Exclude > 10° | Equipment transport and foundation anchoring impossible |
| WDPA Protected Areas | 1 km exclusion buffer | Legal prohibition — Indian environmental law |
| Water Bodies | 500 m exclusion buffer | Flood risk and ecological protection |
| Urban / Built-up Land | All dense urban areas excluded | No available land for large-scale infrastructure |

**Output:** `constraint_map_267.tif` — Binary raster (1 = buildable, 0 = restricted)

**Result:** **69.2% of Odisha** confirmed buildable (mean across 314 blocks)

#### Technical Challenge Resolved
> Initial rasterization set 0 as NoData value, causing QGIS Raster Calculator to fail silently and produce an all-zero output. Fixed by setting NoData = -9999 and pre-initializing rasters correctly. All four constraints combined using logical AND — a pixel must pass all four constraints to be classified as buildable.

---

### Phase 3: Suitability Modeling — MCDA ✅
**Lead:** Keshav

**Objective:** Create three normalized suitability score rasters (Solar, Wind, Biomass) using expert-weighted Multi-Criteria Decision Analysis. All processing performed manually in QGIS 3.x.

**Formula:** `Suitability = Σ(normalized_factor × weight) × constraint_mask`

#### Solar Suitability Weights

| Factor | Weight | Reason |
|--------|--------|--------|
| GHI Irradiance | 35% | Primary energy input driver |
| PV Power Output | 25% | Direct electricity productivity |
| Distance to Transmission | 20% | Grid connection cost |
| Distance to Roads | 10% | Construction and maintenance access |
| Distance to Substations | 10% | Secondary grid connection |

#### Wind Suitability Weights

| Factor | Weight | Reason |
|--------|--------|--------|
| Wind Speed at 100m | 40% | Primary energy driver |
| Distance to Transmission | 25% | Grid connection cost |
| Distance to Roads | 15% | Construction access |
| Distance to Substations | 10% | Grid connection |
| Population Density | 10% | Demand proximity |

#### Biomass Suitability Weights

| Factor | Weight | Reason |
|--------|--------|--------|
| Land Cover Biomass Score | 40% | Agricultural residue proxy |
| Population Density | 30% | Demand and agricultural activity |
| Distance to Roads | 20% | Feedstock transport cost |
| Distance to Substations | 10% | Grid connection |

#### Classification Decision — Why Percentile?
> Fixed thresholds (e.g., GHI > 5.5) were initially applied but abandoned after finding **68% of all solar pixels** fell in one class — Odisha has relatively uniform irradiance across the state. Switched to **percentile-based classification** ensuring exactly 20% of pixels per class (Very High / High / Moderate / Low / Unsuitable). This produces a balanced, statistically meaningful and cartographically useful map.

**Outputs:** `solar_suitability.tif`, `wind_suitability.tif`, `biomass_suitability.tif` (included in phase3.rar)

---

### Phase 4: Feature Extraction ✅
**District Level Lead:** Astitva Tripathi | **Block Level Lead:** Ashutosh Singh

**Objective:** Extract mean zonal statistics per administrative unit to produce the ML training dataset. Work was done in two stages — district level first, then upgraded to block level.

#### Stage 1 — District Level (Astitva Tripathi)

Initial feature extraction performed at 30 district level using QGIS zonal statistics.

| Output | Description |
|--------|-------------|
| `district_features.csv` | 30 districts × 7 features |
| `top_solar_zones.geojson` | High-potential solar zones at district scale |
| `top_wind_zones.geojson` | High-potential wind zones at district scale |
| `top_biomass_zones.geojson` | High-potential biomass zones at district scale |

#### Stage 2 — Block Level Upgrade (Ashutosh Singh)

District level (30 samples) was insufficient for statistically valid 5-fold cross-validation. Ashutosh upgraded the pipeline to block level (314 units) — a 10× sample increase enabling robust ML training.

#### Scale Selection Rationale

| Scale | Units | Decision | Reason |
|-------|-------|----------|--------|
| District | 30 | ❌ Initial attempt | Too small for statistically valid 5-fold CV |
| **Block** | **314** | ✅ **Final selection** | 10× sample increase — robust ML training |
| Gram Panchayat | ~6,000 | ❌ Rejected | Too granular for 267m raster — spatial autocorrelation issues |

**Block boundary source:** Official Census of India 2021 — `Odisha_Admin_Block_BND_2021.shp`

#### Technical Issues Resolved (Block Level)

**Raster Alignment:** Four rasters had a 1-pixel shape mismatch (2012×2421 vs reference 2013×2422). All four reprojected to exactly match reference solar raster grid before zonal statistics.

**Population NoData:** WorldPop encodes NoData as -99999.0 (not NaN). Fixed by filtering to only pixels > 0 before computing mean — prevents -99999 contaminating block averages.

#### Final Feature Statistics (314 Blocks — Zero Missing Values)

| Feature | Source Raster | Mean Value | Unit |
|---------|--------------|------------|------|
| solar_mean | pvout_utm.tif | 4.097 | kWh/kWp/day |
| wind_mean | wind_utm.tif | 4.004 | m/s |
| pop_mean | population_utm.tif | 404.01 | persons/km² |
| dist_roads_mean | dist_roads_aligned.tif | 4.596 | km |
| dist_trans_mean | dist_trans_aligned.tif | 33.968 | km |
| dist_sub_mean | dist_sub_aligned.tif | 43.492 | km |
| constraint_pct | constraint_map_267.tif × 100 | 72.39 | % buildable |

**Block-level output:** `block_features.csv` — 314 rows × 7 features ✅ Zero missing values

#### GIS Zone Outputs (Block Level)

| File | Count | Area |
|------|-------|------|
| `top_solar_zones.geojson` | 1,302 zones | 102,059 km² |
| `top_wind_zones.geojson` | 133 zones | 3,783 km² |
| `top_biomass_zones.geojson` | 3,022 zones | 33,410 km² |

---

### Phase 5: Machine Learning Pipeline ✅
**Lead:** Divyanshu Puri

**Objective:** Train a multi-model ML system for automated block-level energy type prediction with full academic validation and explainability.

#### Full Pipeline (10 Steps)

| Step | Method | Output |
|------|--------|--------|
| 1 | Correlation Heatmap | Multicollinearity check |
| 2 | K-Means (k=4) + Elbow + Silhouette | Spatial clustering + k validation |
| 3 | Rule-Based Label Generation | SOLAR/WIND/BIOMASS/HYBRID training labels |
| 4 | GridSearchCV (18 combinations) | Optimal RF hyperparameters |
| 5 | Random Forest (200 trees, 5-fold CV) | Main classifier |
| 6 | XGBoost (100 trees, lr=0.1) | Cross-algorithm validation |
| 7 | AHP Expert Validation | Expert vs ML weight comparison |
| 8 | SHAP Summary Plot | Per-block feature explainability |
| 9 | Ablation Study | Individual feature contribution |
| 10 | Confidence Override | <60% confidence → HYBRID |

#### Academic Enhancements
- ✅ **Correlation Analysis** — No feature pairs exceeded 0.85 threshold
- ✅ **k-Optimization** — Elbow + Silhouette both validate k=4
- ✅ **GridSearchCV** — 18 hyperparameter combinations, best params applied
- ✅ **Ablation Study** — wind_mean confirmed most critical feature (6.7% drop when removed)
- ✅ **MAUP Analysis** — Block vs district scale prediction shift quantified
- ✅ **SHAP Explainability** — Per-block model interpretation, publication-ready

#### Model Performance

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **RF CV Accuracy** | **97.8% ± 1.3%** | Excellent predictive power |
| **XGBoost Accuracy** | **97.5% ± 1.4%** | Strong algorithm agreement |
| **Silhouette Score** | 0.234 | Fair cluster separation at k=4 |
| **High Confidence Blocks** | 72% | Majority predictions > 80% confidence |
| **AHP–RF Correlation** | r = 0.68 | Phase 3 expert weights validated by ML |

#### Prediction Distribution

| Energy Type | Blocks | % | Notes |
|------------|--------|---|-------|
| 🟠 SOLAR | 250 | 80% | High irradiance dominant across Odisha |
| 🟣 HYBRID | 62 | 20% | Mixed-resource transition zones |
| 🔵 WIND | 2 | 0.6% | Limited high-wind corridors |
| 🟢 BIOMASS | 0 | 0% | Insufficient standalone signal |

#### Phase 5 Output Files

| File | Location | Description |
|------|----------|-------------|
| `block_final_predictions.csv` | outputs/ | 314 blocks with cluster, RF prediction, confidence, final label |
| `random_forest_model.pkl` | outputs/ | Trained and tuned RF model |
| `block_features.csv` | outputs/ | ML input features (314 blocks × 7 features) |
| `block_clusters.csv` | outputs/ | K-Means cluster assignments |
| `model_comparison.csv` | outputs/ | RF vs XGBoost accuracy comparison |
| `ablation_study.csv` | outputs/ | Per-feature accuracy drop |
| `ahp_comparison.csv` | outputs/ | AHP weight vs RF importance |
| `correlation_heatmap.png` | outputs/ | Feature multicollinearity matrix |
| `optimal_k_selection.png` | outputs/ | Elbow + Silhouette validation |
| `feature_importance.png` | outputs/ | RF feature importance |
| `confusion_matrix.png` | outputs/ | Prediction accuracy heatmap |
| `ahp_validation.png` | outputs/ | AHP vs RF comparison chart |
| `ablation_study.png` | outputs/ | Feature contribution chart |
| `cluster_distribution.png` | outputs/ | K-Means spatial cluster map |
| `confidence_distribution.png` | outputs/ | Prediction confidence histogram |
| `model_comparison.png` | outputs/ | RF vs XGBoost bar chart |
| `final_predictions_simple.csv` | new_output/ | Simplified predictions (legacy run) |
| `model_simple.pkl` | new_output/ | Simplified model version |
| `ablation_study.csv` | new_output/ | Ablation results (simplified run) |
| `ahp_comparison_simple.csv` | new_output/ | AHP comparison (simplified run) |
| `model_comparison_simple.csv` | new_output/ | Model comparison (simplified run) |

---

### Phase 6: Decision Support System & Web Visualization ✅
**Lead:** Madhusudhan

**Objective:** A production-grade, lightweight web DSS deployed publicly via GitHub Pages, serving as a high-performance, interactive visualization layer for the final ML suitability results.

#### Technical Architecture & Features
- **Frontend Stack:** Pure Vanilla JavaScript, HTML5, and CSS3. Stripped of all heavy live backend ML logic to ensure instantaneous load times.
- **Mapping Engine:** Advanced dual-view mapping system (Map View + Split View) built to visualize scale-dependent agreement between district and block-level predictions.
- **Map Layers:** Optimal Allocation, Solar Suitability, Wind Suitability, Biomass Suitability, Constraints View — switchable in real time.
- **Filter Controls:** Filter by District, filter by Energy Type (Solar / Wind / Biomass / Hybrid), toggle high-constraint block overlay.
- **Split View:** Synchronized zoom & pan between district-level and block-level prediction maps with per-district agreement scoring.
- **Data Visualization:** Interactive analytics dashboard featuring 7 dynamic charts — Prediction Distribution, Confidence Distribution, Feature vs Prediction scatter, Constraint Severity by District, Block vs District Agreement, Confidence by District, and Energy Mix by District.
- **ML Results Tab:** Displays 8 embedded model visualisation images — Feature Importance, Confusion Matrix, Correlation Heatmap, AHP Validation, Model Comparison, SHAP Summary, Ablation Study, MAUP Analysis.
- **Data Pipeline:** Directly consumes pre-calculated CSV and GeoJSON model outputs from Phase 5 for maximum rendering speed and reliability.
- **Deployment:** Fully hosted and live on GitHub Pages.

#### Critical Deployments & Fixes
- Successfully resolved coordinate projection mismatches that hindered earlier renders.
- Fixed complex local file pathing bugs to ensure smooth cloud deployment.
- Transitioned from a heavy Python modeling environment to a presentation-ready portfolio interface.

**🌐 Live:** [ashutoshsinghj.github.io/renewable-energy-dss-odisha](https://ashutoshsinghj.github.io/renewable-energy-dss-odisha/)

---

## 🚀 Quick Start

```bash
git clone https://github.com/AshutoshSinghJ/renewable-energy-dss-odisha.git
cd renewable-energy-dss-odisha
pip install -r requirements.txt
python phase5/phase5_ml.py
```

**Input:** `phase5/outputs/block_features.csv` *(included in repo)*
**Runtime:** 45–90 seconds
**Output:** `phase5/outputs/` *(auto-created)*

---

## 📂 Repository Structure

```
renewable-energy-dss-odisha/
│
├── .gitignore
├── requirements.txt
├── README.md
│
├── phase1/
│   ├── README.md
│   └── data/
│       ├── districts.geojson        ← 30 Odisha district boundaries
│       └── infrastructure.rar       ← roads, substations, transmission, rail shapefiles
│
├── phase2/
│   ├── README.md
│   └── data/
│       └── Odisha.geojson           ← State boundary used for clipping
│
├── phase3/
│   ├── README.md
│   └── phase3.rar                   ← Suitability rasters + aligned rasters
│
├── phase4/                          ← District level (Astitva Tripathi)
│   ├── README.md
│   ├── Phase4.rar
│   └── data/
│       ├── district_features.csv    ← 30 districts × 7 features
│       ├── top_solar_zones.geojson
│       ├── top_wind_zones.geojson
│       └── top_biomass_zones.geojson
│
├── phase4_block/                    ← Block level (Ashutosh Singh) ← used for ML
│   ├── README.md
│   ├── phase4_block.rar
│   └── data/
│       ├── blocksgeojson.rar        ← 314 block boundaries
│       ├── top_solar_zones.geojson
│       ├── top_wind_zones.geojson
│       └── top_biomass_zones.geojson
│
├── phase5/
│   ├── phase5_ml.py                 ← Main ML pipeline (use this)
│   ├── phase5_mllegacy.py           ← Earlier version for reference
│   ├── outputs/                     ← Primary outputs
│   │   ├── block_final_predictions.csv
│   │   ├── block_features.csv
│   │   ├── block_clusters.csv
│   │   ├── random_forest_model.pkl
│   │   ├── model_comparison.csv
│   │   ├── ablation_study.csv
│   │   ├── ahp_comparison.csv
│   │   └── *.png (8 visualizations)
│   └── new_output/                  ← Simplified model outputs
│       ├── final_predictions_simple.csv
│       ├── model_simple.pkl
│       └── *.png + *.csv (simplified run)
│
└── phase6/                          ← Web DSS (Madhusudhan) — Live on GitHub Pages
    ├── README.md
    ├── index.html                   ← Main dashboard entry point
    ├── style.css                    ← Dark-themed UI stylesheet
    ├── app.js                       ← Core map + chart logic (Leaflet.js + Chart.js)
    └── images/                      ← Embedded ML visualisation PNGs
        ├── feature_importance.png
        ├── confusion_matrix.png
        ├── correlation_heatmap.png
        ├── ahp_validation.png
        ├── models_comparison.png
        ├── shap_summary_plot.png
        ├── ablation_study.png
        └── maup_analysis.png
```

---

## 📦 Requirements

```
pandas>=2.0.0
numpy==1.26.4
scikit-learn>=1.3.0
xgboost>=2.0.0
shap>=0.43.0
matplotlib>=3.7.0
seaborn>=0.12.0
rasterstats==0.20.0
rasterio==1.3.10
geopandas>=1.1.2
shapely>=2.0.0
joblib>=1.3.0
```

---

## 🎓 Academic Contributions

1. **Two-Stage Feature Extraction** — District level (30) attempted first, upgraded to block level (314): 10× sample increase enabling statistically valid cross-validation
2. **Multi-Model Validation** — K-Means + RF + XGBoost + AHP exceeds standard single-model practice
3. **SHAP Explainability** — Per-block model decisions interpretable — publication-ready transparency
4. **MAUP Quantification** — Scale-dependent prediction effects quantified for renewable energy site selection in Odisha
5. **Full Pipeline Reproducibility** — Raw data → constraint map → MCDA → ML → web DSS, fully documented

---

## 🗺️ Data Sources

| Dataset | Source |
|---------|--------|
| Solar (GHI, PVout) | globalsolaratlas.info |
| Wind Speed 100m | globalwindatlas.info |
| DEM / Terrain | earthexplorer.usgs.gov |
| Protected Areas | protectedplanet.net |
| Roads, OSM layers | geofabrik.de |
| Population | worldpop.org |
| Land Cover | Google Earth Engine — Dynamic World |
| Block Boundaries | github.com/justinelliotmeyers/Odisha_2021_Official_Boundaries |

---

## 📖 Citation

```bibtex
@software{odisha_renewable_ml_2026,
  author      = {Ashutosh Singh and Aryan Singh and Keshav and
                 Astitva Tripathi and Divyanshu Puri and Madhusudhan},
  title       = {Multi-Resource Renewable Energy Potential Mapping:
                 ML-Based Decision Support System for Odisha, India},
  year        = {2026},
  institution = {KIIT University, Bhubaneswar},
  publisher   = {GitHub},
  howpublished = {\url{https://github.com/AshutoshSinghJ/renewable-energy-dss-odisha}}
}
```

---

## 🛠️ System Requirements

| Component | Requirement |
|-----------|-------------|
| Python | **3.11 specifically** — other versions have NumPy conflicts |
| GIS | QGIS 3.x (Phases 1–4 only — all processing done manually) |
| RAM | 8GB minimum (raster processing) |
| Storage | ~2GB for full pipeline with raster outputs |
| OS | Windows 10/11 fully tested; Linux/macOS for Phase 5 only |

---

## 📧 Contact & Team

This project was collaboratively developed at **KIIT University, Bhubaneswar** (2025–2026).

| Member | Role | GitHub |
|--------|------|--------|
| Ashutosh Singh | Project Lead, System Architect & ML Engineer | [@AshutoshSinghJ](https://github.com/AshutoshSinghJ) |
| Divyanshu Puri | ML Engineer & GIS Developer | [@assassindiv](https://github.com/assassindiv) |
| Aryan Singh | GIS Developer & ML Engineer |[@arysha123](https://github.com/arysha123) |
| Keshav | GIS Analyst | *(add GitHub if available)* |
| Astitva Tripathi | GIS / Data Processing |[@Fighter-web-debug](https://github.com/Fighter-web-debug) |
| Madhusudhan | Data Processing / GIS Developer | *(add GitHub if available)* |

**Repository:** [github.com/AshutoshSinghJ/renewable-energy-dss-odisha](https://github.com/AshutoshSinghJ/renewable-energy-dss-odisha)

**For questions or collaboration:** Open a [GitHub Issue](https://github.com/AshutoshSinghJ/renewable-energy-dss-odisha/issues) and tag the relevant team member.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Saaty, T.L. (1980) — *The Analytic Hierarchy Process* — AHP weighting
- Openshaw, S. (1984) — *The Modifiable Areal Unit Problem*
- Hengl et al. (2018) — *Random Forest for spatial prediction*
- Lundberg & Lee (2017) — *A Unified Approach to Interpreting Model Predictions* — SHAP

---

**Last Updated:** April 2026 | **Version:** 4.0 | **Status:** Phase 5 ✅ Complete | Phase 6 ✅ Complete | **[🌐 Live Dashboard](https://ashutoshsinghj.github.io/renewable-energy-dss-odisha/)**
