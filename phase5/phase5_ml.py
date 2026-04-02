import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib, os, warnings
import shap  # Added back for Explainable AI
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import silhouette_score, classification_report, confusion_matrix
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, GridSearchCV
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')
sns.set_style('whitegrid')

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION - EXACT ABSOLUTE DIRECTORIES
# ═══════════════════════════════════════════════════════════════════════════
OUTPUT_DIR = r"E:\renewable-energy-dss-odisha\phase5\outputs"
DATA_PATH = r"E:\renewable-energy-dss-odisha\phase4_block\data\block_features.csv"

# Automatically create the output folder if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load data
try:
    df = pd.read_csv(DATA_PATH)
    print(f'\n{"="*60}\nDataset: {len(df)} blocks loaded from {DATA_PATH}\n{"="*60}\n')
except FileNotFoundError:
    print(f"❌ ERROR: Could not find input data at {DATA_PATH}.")
    exit()

features = ['solar_mean', 'wind_mean', 'pop_mean', 'dist_roads_mean', 
            'dist_trans_mean', 'dist_sub_mean', 'constraint_pct']
X = df[features].copy()

# ═══════════════════════════════════════════════════════════════════════════
# ENHANCEMENT 1: Correlation Heatmap
# ═══════════════════════════════════════════════════════════════════════════
print('Enhancement 1: Correlation Analysis')
corr_matrix = df[features].corr()
plt.figure(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', center=0, square=True, linewidths=0.5)
plt.title('Feature Correlation Matrix — Multicollinearity Check')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, 'correlation_heatmap.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════════════════
# ENHANCEMENT 2: Optimal k Selection 
# ═══════════════════════════════════════════════════════════════════════════
print('Enhancement 2: Optimal k Selection')
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

inertias, silhouette_scores, k_range = [], [], range(2, 11)
for k in k_range:
    km = KMeans(n_clusters=k, init='k-means++', random_state=42, n_init=10)
    labels = km.fit_predict(X_scaled)
    inertias.append(km.inertia_)
    silhouette_scores.append(silhouette_score(X_scaled, labels))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
ax1.plot(list(k_range), inertias, 'bo-', lw=2, ms=8)
ax1.axvline(x=4, color='red', ls='--', label='k=4')
ax1.set(xlabel='Number of Clusters (k)', ylabel='Inertia', title='Elbow Method')
ax1.legend(); ax1.grid(alpha=0.3)

ax2.plot(list(k_range), silhouette_scores, 'ro-', lw=2, ms=8)
ax2.axvline(x=4, color='blue', ls='--', label='k=4')
ax2.set(xlabel='Number of Clusters (k)', ylabel='Silhouette Score', title='Silhouette Analysis')
ax2.legend(); ax2.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, 'optimal_k_selection.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 & 2: K-Means Clustering & Label Generation
# ═══════════════════════════════════════════════════════════════════════════
print('Step 1 & 2: K-Means & Labeling')
kmeans = KMeans(n_clusters=4, init='k-means++', random_state=42, n_init=10)
df['cluster'] = kmeans.fit_predict(X_scaled)

max_vals = {'solar': df['solar_mean'].max(), 'wind': df['wind_mean'].max(), 'pop': df['pop_mean'].max()}
def assign_label(row):
    norm = {'SOLAR': row['solar_mean']/max_vals['solar'], 
            'WIND': row['wind_mean']/max_vals['wind'],
            'BIOMASS': row['pop_mean']/max_vals['pop']}
    best = max(norm, key=norm.get)
    scores = sorted(norm.values(), reverse=True)
    return 'HYBRID' if (scores[0] - scores[1]) < 0.15 else best

df['label'] = df.apply(assign_label, axis=1)

# ═══════════════════════════════════════════════════════════════════════════
# ENHANCEMENT 3 & STEP 3: GridSearchCV & Random Forest Training
# ═══════════════════════════════════════════════════════════════════════════
print('Step 3: Random Forest Training (Single Core to prevent crash)')
y = df['label']
param_grid = {'n_estimators': [100, 200], 'max_depth': [5, 10, None], 'min_samples_split': [2, 3, 5]}
grid_search = GridSearchCV(RandomForestClassifier(class_weight='balanced', random_state=42), 
                           param_grid, cv=5, scoring='accuracy', n_jobs=1, verbose=0)
grid_search.fit(X, y)
rf = grid_search.best_estimator_
cv_scores = cross_val_score(rf, X, y, cv=5, scoring='accuracy', n_jobs=1)

df['rf_prediction'] = rf.predict(X)
df['rf_confidence'] = rf.predict_proba(X).max(axis=1)
joblib.dump(rf, os.path.join(OUTPUT_DIR, 'model_simple.pkl'))

# Confusion Matrix
cm = confusion_matrix(y, df['rf_prediction'], labels=['SOLAR', 'WIND', 'BIOMASS', 'HYBRID'])
plt.figure(figsize=(7, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=['SOLAR', 'WIND', 'BIOMASS', 'HYBRID'],
            yticklabels=['SOLAR', 'WIND', 'BIOMASS', 'HYBRID'])
plt.title('Random Forest — Confusion Matrix')
plt.ylabel('True Label'); plt.xlabel('Predicted Label')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, 'confusion_matrix.png'), dpi=150)
plt.close('all')

# ═══════════════════════════════════════════════════════════════════════════
# NEW: SHAP Explainer Plot
# ═══════════════════════════════════════════════════════════════════════════
print('Generating SHAP Summary Plot...')
try:
    explainer = shap.TreeExplainer(rf)
    shap_values = explainer.shap_values(X)
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_values, X, show=False, class_names=rf.classes_)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'shap_summary_plot.png'), bbox_inches='tight', dpi=150)
    plt.close()
    print("✓ SHAP Summary saved.\n")
except Exception as e:
    print(f"⚠ SHAP generation failed: {e}\n")

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: XGBoost Validation
# ═══════════════════════════════════════════════════════════════════════════
print('Step 4: XGBoost Validation')
le = LabelEncoder()
y_enc = le.fit_transform(y)
xgb = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42, 
                    eval_metric='mlogloss', verbosity=0)
xgb_scores = cross_val_score(xgb, X, y_enc, cv=5, scoring='accuracy')

comparison = pd.DataFrame({'Model': ['Random Forest', 'XGBoost'],
                           'CV_Accuracy': [cv_scores.mean(), xgb_scores.mean()],
                           'Std_Dev': [cv_scores.std(), xgb_scores.std()]})
plt.figure(figsize=(8, 5))
plt.bar(comparison['Model'], comparison['CV_Accuracy'], color=['coral', 'steelblue'], yerr=comparison['Std_Dev'], capsize=5)
plt.ylim(0, 1.1)
plt.ylabel('Cross-Validation Accuracy')
plt.title('Model Validation Comparison')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, 'models_comparison.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: AHP Validation & Ablation
# ═══════════════════════════════════════════════════════════════════════════
print('Step 5: AHP Validation')
ahp_weights = {'solar_mean': 0.32, 'wind_mean': 0.28, 'pop_mean': 0.15,
               'dist_roads_mean': 0.10, 'dist_trans_mean': 0.08,
               'dist_sub_mean': 0.04, 'constraint_pct': 0.03}
ahp_comp = pd.DataFrame({'Feature': features, 'AHP_Expert': [ahp_weights[f] for f in features],
                         'RF_Learned': rf.feature_importances_}).sort_values('RF_Learned', ascending=False)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
ahp_s = ahp_comp.sort_values('AHP_Expert', ascending=True)
ax1.barh(ahp_s['Feature'], ahp_s['AHP_Expert'], color='steelblue')
ax1.set(xlabel='Weight', title='AHP Expert Weights')
rf_s = ahp_comp.sort_values('RF_Learned', ascending=True)
ax2.barh(rf_s['Feature'], rf_s['RF_Learned'], color='coral')
ax2.set(xlabel='Importance', title='Random Forest Learned Importance')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, 'ahp_validation.png'), dpi=150)
plt.close()

plt.figure(figsize=(8, 5))
plt.barh(rf_s['Feature'], rf_s['RF_Learned'], color='coral')
plt.xlabel('Importance')
plt.title('Random Forest Feature Importance')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, 'feature_importance.png'), dpi=150)
plt.close()

baseline = cv_scores.mean()
ablation_results = []
for feat in features:
    X_drop = df[[f for f in features if f != feat]]
    score = cross_val_score(rf, X_drop, y, cv=5, scoring='accuracy').mean()
    ablation_results.append({'Feature': feat, 'Accuracy_Without': score, 'Accuracy_Drop': baseline - score})

ablation_df = pd.DataFrame(ablation_results).sort_values('Accuracy_Drop', ascending=False)
plt.figure(figsize=(10, 5))
colors = ['red' if x > 0.05 else 'orange' if x > 0.01 else 'green' for x in ablation_df['Accuracy_Drop']]
plt.bar(ablation_df['Feature'], ablation_df['Accuracy_Drop'], color=colors)
plt.axhline(y=0, color='black', ls='-', lw=0.5)
plt.xlabel('Feature Removed'); plt.ylabel('Accuracy Drop')
plt.title('Feature Ablation Study')
plt.xticks(rotation=30, ha='right')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, 'ablation_study.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Final Predictions
# ═══════════════════════════════════════════════════════════════════════════
df['final_prediction'] = df.apply(lambda r: 'HYBRID' if r['rf_confidence'] < 0.60 else r['rf_prediction'], axis=1)
output_cols = ['block_name', 'cluster', 'label', 'rf_prediction', 'rf_confidence', 'final_prediction'] + features
df[output_cols].to_csv(os.path.join(OUTPUT_DIR, 'final_predictions_simple.csv'), index=False)

# ═══════════════════════════════════════════════════════════════════════════
# ENHANCEMENT 5: MAUP Analysis
# ═══════════════════════════════════════════════════════════════════════════
# FIXED PATH: Pointed to 'phase4' instead of 'phase4_block' based on your folder structure!
DISTRICT_DATA = r"E:\renewable-energy-dss-odisha\phase4\data\district_features.csv"
DISTRICT_OUT = os.path.join(OUTPUT_DIR, 'final_predictions_district.csv')
BLOCK_OUT = os.path.join(OUTPUT_DIR, 'final_predictions_simple.csv')

if os.path.exists(DISTRICT_DATA):
    print('Enhancement 5: MAUP Analysis')
    try:
        # We need a quick mock prediction for districts to compare
        dist_df = pd.read_csv(DISTRICT_DATA)
        dist_X = dist_df[features].copy()
        dist_df['rf_prediction'] = rf.predict(dist_X)
        dist_df['rf_confidence'] = rf.predict_proba(dist_X).max(axis=1)
        dist_df['final_prediction'] = dist_df.apply(lambda r: 'HYBRID' if r['rf_confidence'] < 0.60 else r['rf_prediction'], axis=1)
        dist_df.to_csv(DISTRICT_OUT, index=False)

        block_df = pd.read_csv(BLOCK_OUT)
        
        # We must link block_features to districts to do MAUP. We'll use your JS map approach!
        # Assuming your CSV output hasn't run the `add_districts.py` yet, MAUP will try to use 'district_name' if it exists.
        if 'district_name' in dist_df.columns and 'district' in block_df.columns:
            block_dom = block_df.groupby('district')['final_prediction'].agg(lambda x: x.value_counts().index[0]).reset_index()
            block_dom.columns = ['District', 'Block_Level']
            
            dist_col = 'district_name'
            comparison = block_dom.merge(dist_df[[dist_col, 'final_prediction']].rename(
                columns={dist_col: 'District', 'final_prediction': 'District_Level'}), on='District', how='inner')
            
            comparison['Agreement'] = comparison.apply(lambda r: 'AGREE' if r['Block_Level'] == r['District_Level'] else 'DISAGREE', axis=1)
            disagree = (comparison['Agreement'] == 'DISAGREE').sum()
            
            plt.figure(figsize=(10, 6))
            plt.bar(['Agree', 'Disagree'], [(comparison['Agreement']=='AGREE').sum(), disagree], 
                    color=['green', 'orange'], alpha=0.7, edgecolor='black')
            plt.ylabel('Number of Districts')
            plt.title(f'Block vs District Scale Agreement ({disagree}/{len(comparison)} MAUP effects)')
            plt.tight_layout()
            plt.savefig(os.path.join(OUTPUT_DIR, 'maup_analysis.png'), dpi=150)
            plt.close()
            print(f"✓ MAUP: {disagree}/{len(comparison)} districts disagree\n")
        else:
            print("⚠ MAUP skipped: District linkage missing in CSV. (Will fix when you run add_districts.py)")
            # Fallback blank image just so the UI doesn't break
            plt.figure(figsize=(10,6)); plt.text(0.5,0.5,"MAUP Analysis Pending\nRun add_districts.py first", ha='center'); plt.savefig(os.path.join(OUTPUT_DIR, 'maup_analysis.png')); plt.close()

    except Exception as e:
        print(f"⚠ MAUP analysis failed: {e}\n")

print(f"\n{'='*60}\n✓ PIPELINE COMPLETE\n{'='*60}")