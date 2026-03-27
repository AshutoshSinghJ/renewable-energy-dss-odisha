import geopandas as gpd
import pandas as pd

# Load files
blocks = gpd.read_file("blocks.geojson")
predictions = pd.read_csv("block_final_predictions.csv")

# Merge predictions into GeoJSON on block_name
blocks_merged = blocks.merge(predictions, on="block_name", how="left")

# Check result
print("Merged shape:", blocks_merged.shape)
print("Columns:", blocks_merged.columns.tolist())
print("Sample row:")
print(blocks_merged[['block_name', 'district_n', 'final_prediction', 'rf_confidence', 'cluster']].head(3))

# Save the merged file
blocks_merged.to_file("blocks_complete.geojson", driver="GeoJSON")
print("\n✅ blocks_complete.geojson created successfully!")