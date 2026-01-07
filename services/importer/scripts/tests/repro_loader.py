
import sys
import os
import json
from datetime import datetime
from uuid import uuid4

# Add services/importer to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from domain import NormalizedEstimate, Preventivo, Measurement, MeasurementDetail, PriceListItem, WbsNode
from loader import LoaderService

def create_dummy_estimate():
    # 1. WBS Nodes
    wbs = [
        WbsNode(id="wbs1", code="01", name="Group 1", level=1, parent_id=None, type="chapter"),
        WbsNode(id="wbs2", code="01.01", name="Group 1.1", level=6, parent_id="wbs1", type="category"),
    ]

    # 2. Price List Items
    pli = PriceListItem(
        id="prod1",
        code="A.01.001",
        description="Concrete Item",
        long_description="Long description of Concrete Item",
        unit="m3",
        price_by_list={"default": 100.0, "special": 90.0},
        wbs_ids=["wbs2"]
    )

    # 3. Measurement
    meas = Measurement(
        id="meas1",
        product_id="prod1",
        total_quantity=10.0,
        price_list_id="special",  # Should use 90.0
        wbs_node_ids=["wbs2"],
        details=[MeasurementDetail(formula="5*2", quantity=10.0)]
    )

    # 4. Preventivo
    prev = Preventivo(
        id="prev1",
        code="P01",
        name="Main Estimate",
        measurements=[meas]
    )

    return NormalizedEstimate(
        project_name="Test Project",
        wbs_nodes=wbs,
        price_list_items=[pli],
        preventivi=[prev],
        units={"m3": "Cubic Meter"},
        metadata={"author": "Tester"}
    )

def run():
    est = create_dummy_estimate()
    
    # Run Loader
    # We mock uuid to get consistent IDs for regression testing? 
    # Actually LoaderService generates random UUIDs for Project and IDs.
    # We might need to mock uuid or just ignore the variable IDs in comparison.
    # For now let's just run it and see the output structure.
    
    project, groups, price_list, estimate = LoaderService.transform(est, project_id="PROJ_FIXED", preventivo_id="prev1")

    # Serialize to JSON-compatible dict
    output = {
        "project": project.dict(),
        "groups": [g.dict() for g in groups],
        "price_list": price_list.dict(),
        "estimate": estimate.dict()
    }
    
    # Sanitize dynamic fields for comparison (dates, random IDs if any not fixed)
    # Project ID is fixed.
    # Project code has timestamp: "IMP-" + datetime...
    output["project"]["code"] = "FIXED_CODE" 
    
    print(json.dumps(output, default=str, indent=2))

if __name__ == "__main__":
    run()
