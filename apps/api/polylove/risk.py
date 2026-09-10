from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from polylove.domain import MarketState, RiskDecision, RiskPolicy, SignalCandidate


def quarter_kelly_size(
    *,
    fair_probability: float,
    market_probability: float,
    bankroll: float,
    max_market_fraction: float,
) -> Decimal:
    """Return a quarter-Kelly stake, capped to the market risk budget."""
    odds = (1 - market_probability) / market_probability
    full_kelly = (odds * fair_probability - (1 - fair_probability)) / odds
    fraction = max(0.0, full_kelly / 4)
    capped_fraction = min(fraction, max_market_fraction)
    return Decimal(str(bankroll * capped_fraction)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def evaluate_signal(
    candidate: SignalCandidate,
    market: MarketState,
    policy: RiskPolicy,
    *,
    bankroll: float,
    existing_market_exposure: float = 0,
) -> RiskDecision:
    edge = candidate.fair_probability - market.probability
    if market.is_stale:
        return RiskDecision(action="AVOID", edge=edge, limitations=["stale market data"])
    if abs(edge) < policy.min_edge:
        return RiskDecision(action="WATCH", edge=edge, limitations=["edge below threshold"])
    if candidate.confidence < policy.min_confidence:
        return RiskDecision(action="WATCH", edge=edge, limitations=["confidence below threshold"])
    if market.liquidity < policy.min_liquidity:
        return RiskDecision(action="AVOID", edge=edge, limitations=["liquidity below threshold"])
    if market.spread > policy.max_spread:
        return RiskDecision(action="AVOID", edge=edge, limitations=["spread above threshold"])
    max_exposure = bankroll * policy.max_market_fraction
    if existing_market_exposure >= max_exposure:
        return RiskDecision(action="AVOID", edge=edge, limitations=["market exposure cap reached"])
    stake = quarter_kelly_size(
        fair_probability=candidate.fair_probability,
        market_probability=market.probability,
        bankroll=bankroll,
        max_market_fraction=policy.max_market_fraction,
    )
    remaining = Decimal(str(max_exposure - existing_market_exposure)).quantize(Decimal("0.01"))
    return RiskDecision(
        action="ENTER",
        edge=edge,
        recommended_size=min(stake, remaining),
        limitations=[],
    )
