"""
Domain Layer - Core business entities and services.

This module provides backward-compatible exports from the new DDD structure.
"""

# Entities
from .entities.price_list_item import PriceListItem
from .entities.measurement import Measurement, MeasurementDetail
from .entities.estimate import Estimate, EstimateItem, Preventivo
from .entities.wbs_node import WbsNode
from .entities.price_list import PriceList

# Services
from .services.amount_calculator import AmountCalculator

# Value Objects
from .value_objects.money import Money

# Backward-compatible aliases
NormalizedEstimate = Estimate  # Legacy name
PreventivoModel = Preventivo   # Legacy name

__all__ = [
    # Entities
    "PriceListItem",
    "Measurement",
    "MeasurementDetail",
    "Estimate",
    "EstimateItem",
    "Preventivo",
    "WbsNode",
    "PriceList",
    # Services
    "AmountCalculator",
    # Value Objects
    "Money",
    # Aliases (backward compat)
    "NormalizedEstimate",
    "PreventivoModel",
]
