import geopandas as gpd

blocks = gpd.read_file("blocks_complete.geojson")
print("CRS:", blocks.crs)
print("Bounds:", blocks.total_bounds)
