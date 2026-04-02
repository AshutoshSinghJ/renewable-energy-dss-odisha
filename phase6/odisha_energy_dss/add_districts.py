import json
import pandas as pd
import os

# Define the exact paths
csv_path = 'block_features.csv'
geojson_path = 'data/blocks_complete.geojson'

print("Loading Phase 5 ML output data...")
try:
    df = pd.read_csv(csv_path)
except FileNotFoundError:
    print(f"❌ ERROR: Could not find {csv_path}.")
    exit()

print("Loading GeoJSON Map...")
try:
    with open(geojson_path, 'r', encoding='utf-8') as f:
        geojson = json.load(f)
except FileNotFoundError:
    print(f"❌ ERROR: Could not find {geojson_path}. Ensure it is inside the 'data' folder.")
    exit()

print("Extracting Block -> District mapping from GeoJSON...")
block_to_dist = {}

# FIXED: Added 'district_n' to the search keys so it matches your specific GeoJSON!
BLOCK_KEYS = ['block_name', 'BLOCK_NAME', 'Block_Name', 'blockname', 'block', 'BLOCK']
DIST_KEYS  = ['district_n', 'district', 'DISTRICT', 'District', 'dist_name', 'district_name']

for feat in geojson.get('features', []):
    props = feat.get('properties', {})
    
    # Hunt for the block and district names
    b_name = next((props[k] for k in BLOCK_KEYS if k in props and props[k]), None)
    d_name = next((props[k] for k in DIST_KEYS if k in props and props[k]), None)
    
    if b_name and d_name:
        # Clean strings for perfect matching
        safe_b_name = str(b_name).strip().lower()
        block_to_dist[safe_b_name] = str(d_name).strip()

print(f"Found {len(block_to_dist)} block mappings in the map file.")

# Function to safely map the district
def get_district(b_name):
    safe_name = str(b_name).strip().lower()
    return block_to_dist.get(safe_name, "Unknown")

# Apply mapping to the dataframe
df['district'] = df['block_name'].apply(get_district)

# Overwrite the CSV with the new district column
df.to_csv(csv_path, index=False)

success_count = len(df[df['district'] != 'Unknown'])
print(f"\n✅ SUCCESS! Mapped {success_count} out of {len(df)} blocks.")
print("Your 'block_features.csv' is now perfectly ready for the Web UI!")