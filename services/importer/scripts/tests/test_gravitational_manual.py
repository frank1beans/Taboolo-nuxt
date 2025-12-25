import sys
import os
import numpy as np
import pandas as pd
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current dir to path to find logic modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from logic.gravitational_clustering import GravitationalClustering

def generate_synthetic_data(n_samples=100, dim=10):
    np.random.seed(42)
    
    data = []
    
    # Define 3 "True" WBS6 centers
    centers = {
        'WBS.01': np.random.rand(dim),
        'WBS.02': np.random.rand(dim),
        'WBS.03': np.random.rand(dim)
    }
    
    # Helper to normalize
    def norm(v): return v / np.linalg.norm(v)
    
    for k, v in centers.items():
        centers[k] = norm(v)
        
    # Generate points
    for i in range(n_samples):
        # 80% chance to be "normal" member of a group
        # 10% chance to be "mis-labeled" (native WBS is X, but pos is near Y)
        # 10% noise
        
        r = np.random.rand()
        
        if r < 0.8:
            # Normal
            wbs = np.random.choice(list(centers.keys()))
            center = centers[wbs]
            # Add small noise
            vec = center + np.random.normal(0, 0.1, dim)
            vec = norm(vec)
            desc = f"Item of {wbs} number {i}"
        elif r < 0.9:
            # Mislabeled / Drifting
            true_wbs = np.random.choice(list(centers.keys()))
            target_wbs = np.random.choice([k for k in centers.keys() if k != true_wbs])
            
            wbs = true_wbs # The "label" in column is this
            # But position is near target
            center = centers[target_wbs]
            vec = center + np.random.normal(0, 0.15, dim) 
            vec = norm(vec)
            desc = f"Item {wbs} drifting to {target_wbs} {i}"
        else:
            # Noise
            wbs = np.random.choice(list(centers.keys()))
            vec = np.random.rand(dim)
            vec = norm(vec)
            desc = f"Noise item {wbs} {i}"
            
        data.append({
            'id': i,
            'wbs6': wbs,
            'description': desc,
            'embedding': vec
        })
        
    return pd.DataFrame(data)

def test_pipeline():
    print("--- Generating Data ---")
    df = generate_synthetic_data(n_samples=200, dim=16)
    print(f"Generated {len(df)} samples.")
    print("WBS counts:", df['wbs6'].value_counts().to_dict())
    
    print("\n--- Init Model ---")
    # Low min_basin_size for small test data
    model = GravitationalClustering(min_basin_size=5, adaptive_percentile=10)
    
    print("\n--- Running Fit Predict ---")
    result_df, reports = model.fit_predict(df)
    
    print("\n--- Results ---")
    print("Columns:", result_df.columns.tolist())
    
    print("\nSample Rows:")
    print(result_df[['wbs6', 'target_basin', 'attraction_score', 'assigned_basin', 'cluster_id']].head(10))
    
    print("\n--- Basin Assignment Stats ---")
    print(result_df['assigned_basin'].value_counts(dropna=False))
    
    print("\n--- Cluster ID Stats ---")
    print(result_df['cluster_id'].value_counts())
    
    print("\n--- Checking Reports ---")
    for basin, report in reports.items():
        print(f"\nBasin: {basin}")
        for cluster_id, info in report.items():
            print(f"  Cluster {cluster_id}: Size {info['size']}")
            print(f"  Keywords: {info.get('keywords')}")
            print(f"  Central Examples: {[x['desc'] for x in info.get('central_examples', [])[:2]]}")
            
    # Assertions
    assert 'cluster_id' in result_df.columns
    assert 'attraction_score' in result_df.columns
    assert len(reports) > 0
    
    print("\n✅ Verification Successful!")

if __name__ == "__main__":
    test_pipeline()
