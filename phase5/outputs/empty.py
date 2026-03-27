import geopandas as gpd
import pandas as pd

blocks = gpd.read_file("blocks.geojson")
predictions = pd.read_csv("block_final_predictions.csv")

print("GeoJSON columns:", blocks.columns.tolist())
print("GeoJSON shape:", blocks.shape)

print("\nAll column names and first value:")
for col in blocks.columns:
    print(col, ":", blocks[col].iloc[0])