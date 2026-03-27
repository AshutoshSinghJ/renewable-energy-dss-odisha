import json

with open("blocks_complete.geojson", "r") as f:
    data = json.load(f)

print("Total features:", len(data['features']))
print("First feature properties:", data['features'][0]['properties'].keys())
print("Sample prediction:", data['features'][0]['properties'].get('final_prediction'))
print("Sample confidence:", data['features'][0]['properties'].get('rf_confidence'))