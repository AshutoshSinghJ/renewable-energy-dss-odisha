import geopandas as gpd
import pandas as pd
blocks = gpd.read_file("blocks_complete.geojson")
blocks['geometry'] = blocks['geometry'].simplify(tolerance=0.001, preserve_topology=True)
blocks.to_file("blocks_complete_small.geojson", driver="GeoJSON")
import os
size = os.path.getsize("blocks_complete_small.geojson") / (1024*1024)
print(f"New file size: {size:.1f} MB")
print("Done!")