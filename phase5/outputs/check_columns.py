import pandas as pd

df1 = pd.read_csv("block_final_predictions.csv")
df2 = pd.read_csv("block_clusters.csv")
df3 = pd.read_csv("block_features.csv")

print("=== block_final_predictions.csv ===")
print(df1.columns.tolist())
print(df1.head(3).to_string())

print("\n=== block_clusters.csv ===")
print(df2.columns.tolist())
print(df2.head(3).to_string())

print("\n=== block_features.csv ===")
print(df3.columns.tolist())
print(df3.head(3).to_string())
