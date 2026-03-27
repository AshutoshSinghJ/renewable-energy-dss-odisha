import geopandas as gpd
import pandas as pd

# Load original blocks.geojson
blocks = gpd.read_file("blocks.geojson")

# Load predictions CSV
predictions = pd.read_csv("block_final_predictions.csv")

# Convert to lat/lng (EPSG:4326) FIRST
blocks = blocks.to_crs("EPSG:4326")

# Now merge predictions
blocks_merged = blocks.merge(predictions, on="block_name", how="left")

# Verify
print("CRS after conversion:", blocks_merged.crs)
print("Bounds after conversion:", blocks_merged.total_bounds)
print("Total features:", len(blocks_merged))
print("Sample prediction:", blocks_merged['final_prediction'].iloc[0])

# Save corrected file
blocks_merged.to_file("blocks_complete.geojson", driver="GeoJSON")
print("\n✅ Fixed! blocks_complete.geojson saved with correct projection.")