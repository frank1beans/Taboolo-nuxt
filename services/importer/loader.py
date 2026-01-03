
from typing import List, Tuple, Optional
from datetime import datetime
import os
import uuid

# Domain entities and services
from domain import NormalizedEstimate, PriceListItem as DomainPriceItem
from domain.services.amount_calculator import AmountCalculator

# DTOs for API output
from infrastructure.dto import (
    Project, WbsNode, PriceList, PriceListItem, 
    Estimate, EstimateItem, MeasurementDetail
)

# New Logic Loaders
from ingestion.loaders.project import ProjectLoader
from ingestion.loaders.wbs import WbsLoader
from ingestion.loaders.price_list import PriceListLoader
from ingestion.loaders.estimate import EstimateLoader
from embedding.extraction.service import PropertyExtractionService

class LoaderService:
    @staticmethod
    def transform(
        estimate: NormalizedEstimate,
        project_id: Optional[str] = None,
        preventivo_id: Optional[str] = None,
        extract_properties: bool = False,
    ) -> Tuple[Project, List[WbsNode], PriceList, Estimate]:
        
        # 1. Project
        project = ProjectLoader.create(estimate, project_id)
        
        # 2. Groups (WBS)
        groups = WbsLoader.create(estimate, project.id)
        
        # 3. PriceList
        price_list = PriceListLoader.create(estimate, project.id, groups, preventivo_id)

        # 4. Estimate
        estimate_doc = EstimateLoader.create(estimate, project.id, price_list, preventivo_id)

        # 5. Extract technical properties (optional)
        if extract_properties and price_list.items:
            PropertyExtractionService.enrich_price_list(price_list, estimate_doc)

        return project, groups, price_list, estimate_doc

