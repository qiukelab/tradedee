from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class MarketState(BaseModel):
    market_id: str
    probability: float = Field(gt=0, lt=1)
    spread: float = Field(ge=0)
    liquidity: float = Field(ge=0)
    observed_at: datetime
    is_stale: bool = False


class SignalCandidate(BaseModel):
    fair_probability: float = Field(gt=0, lt=1)
    confidence: float = Field(ge=0, le=1)
    evidence_ids: list[str] = Field(min_length=1)


class RiskPolicy(BaseModel):
    min_edge: float = 0.05
    min_confidence: float = 0.65
    min_liquidity: float = 10_000
    max_spread: float = 0.03
    max_market_fraction: float = 0.01
    max_category_fraction: float = 0.05
    max_portfolio_fraction: float = 0.10
    daily_loss_fraction: float = 0.02


class RiskDecision(BaseModel):
    action: Literal["ENTER", "WATCH", "AVOID"]
    recommended_size: Decimal = Decimal("0")
    edge: float
    limitations: list[str] = []
