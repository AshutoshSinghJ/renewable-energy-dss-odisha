import pandas as pd
import matplotlib.pyplot as plt
import joblib
import os
import shap
import warnings

warnings.filterwarnings('ignore')

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION - EXACT DIRECTORY PATHS
# ═══════════════════════════════════════════════════════════════════════════
BASE_DIR = r"E:\renewable-energy-dss-odisha"
OUTPUT_DIR = os.path.join(BASE_DIR, "phase5", "outputs")

# Load the trained Random Forest model
MODEL_PATH = os.path.join(OUTPUT_DIR, "model_simple.pkl")

# FIXED: Hardcoded exactly to your updated Phase 6 web folder CSV!
BLOCK_DATA_PATH = r"E:\renewable-energy-dss-odisha\phase6\odisha_energy_dss\block_features.csv"

# The Phase 4 District Data
DISTRICT_DATA_PATH = os.path.join(BASE_DIR, "phase4", "data", "district_features.csv")

features = ['solar_mean', 'wind_mean', 'pop_mean', 'dist_roads_mean', 
            'dist_trans_mean', 'dist_sub_mean', 'constraint_pct']

print("Loading data and pre-trained model...")
try:
    rf = joblib.load(MODEL_PATH)
    block_df = pd.read_csv(BLOCK_DATA_PATH)
    X_block = block_df[features].copy()
    print(f"✓ Successfully loaded corrected blocks from: {BLOCK_DATA_PATH}")
except Exception as e:
    print(f"❌ ERROR loading data: {e}")
    exit()

# ═══════════════════════════════════════════════════════════════════════════
# 1. SHAP SUMMARY PLOT
# ═══════════════════════════════════════════════════════════════════════════
print("Generating SHAP Summary Plot...")
try:
    explainer = shap.TreeExplainer(rf)
    shap_values = explainer.shap_values(X_block)
    
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_values, X_block, show=False, class_names=rf.classes_)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'shap_summary_plot.png'), bbox_inches='tight', dpi=150)
    plt.close()
    print("✓ SHAP Summary Plot saved successfully!")
except Exception as e:
    print(f"⚠ SHAP error: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# 2. MAUP ANALYSIS PLOT (Block vs District)
# ═══════════════════════════════════════════════════════════════════════════
print("Generating MAUP Analysis Plot...")
try:
    dist_df = pd.read_csv(DISTRICT_DATA_PATH)
    X_dist = dist_df[features].copy()
    
    # Predict for the 30 Districts using your trained model
    dist_df['rf_prediction'] = rf.predict(X_dist)
    dist_df['rf_confidence'] = rf.predict_proba(X_dist).max(axis=1)
    dist_df['final_prediction'] = dist_df.apply(lambda r: 'HYBRID' if r['rf_confidence'] < 0.60 else r['rf_prediction'], axis=1)
    
    # Check if your CSV actually has the 'district' column now
    if 'district' not in block_df.columns:
        print("❌ ERROR: Your block_features.csv does not have a 'district' column! Please run add_districts.py first.")
    else:
        # Calculate what the Blocks say the District dominant energy should be
        block_dom = block_df.groupby('district')['final_prediction'].agg(lambda x: x.value_counts().index[0]).reset_index()
        block_dom.columns = ['District', 'Block_Level']
        
        # Merge the two scales together
        dist_col = 'district_name' if 'district_name' in dist_df.columns else 'district'
        comparison = block_dom.merge(dist_df[[dist_col, 'final_prediction']].rename(
            columns={dist_col: 'District', 'final_prediction': 'District_Level'}), on='District', how='inner')
        
        # Calculate Agree/Disagree
        comparison['Agreement'] = comparison.apply(lambda r: 'AGREE' if r['Block_Level'] == r['District_Level'] else 'DISAGREE', axis=1)
        disagree = (comparison['Agreement'] == 'DISAGREE').sum()
        agree = (comparison['Agreement'] == 'AGREE').sum()
        
        comparison.to_csv(os.path.join(OUTPUT_DIR, 'maup_scale_comparison.csv'), index=False)
        
        # Draw the Bar Chart
        plt.figure(figsize=(8, 6))
        bars = plt.bar(['Agree', 'Disagree'], [agree, disagree], color=['#1a9641', '#d7191c'], alpha=0.8, edgecolor='black')
        
        for bar in bars:
            yval = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2, yval + 0.5, int(yval), ha='center', va='bottom', fontweight='bold')
            
        plt.ylabel('Number of Districts')
        plt.title(f'Block vs District Scale Agreement\n({disagree} out of {len(comparison)} districts show MAUP effects)')
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, 'maup_analysis.png'), dpi=150)
        plt.close()
        
        print(f"✓ MAUP Analysis Plot saved successfully! ({disagree} disagreements found)")
except Exception as e:
    print(f"⚠ MAUP error: {e}")

print(f"\n{'='*60}\nDONE! Copy the 2 images from phase5\\outputs to your images\\ folder.\n{'='*60}")