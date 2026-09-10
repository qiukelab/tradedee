from datetime import UTC, datetime

import pytest

from polylove.domain import MarketState, RiskPolicy, SignalCandidate
from polylove.risk import evaluate_signal, quarter_kelly_size


def test_quarter_kelly_is_capped_at_one_percent_of_bankroll() -> None:
    size = quarter_kelly_size(
        fair_probability=0.70,
        market_probability=0.50,
        bankroll=10_000,
        max_market_fraction=0.01,
    )

    assert size == 100


def test_stale_market_cannot_produce_enter_signal() -> None:
    market = MarketState(
        market_id="election-2030",
        probability=0.50,
        spread=0.01,
        liquidity=50_000,
        observed_at=datetime(2026, 9, 9, tzinfo=UTC),
        is_stale=True,
    )
    candidate = SignalCandidate(
        fair_probability=0.62,
        confidence=0.82,
        evidence_ids=["news-1"],
    )

    decision = evaluate_signal(candidate, market, RiskPolicy(), bankroll=10_000)

    assert decision.action == "AVOID"
    assert "stale" in decision.limitations[0]


def test_risk_policy_rejects_market_exposure_above_cap() -> None:
    market = MarketState(
        market_id="btc-100k",
        probability=0.50,
        spread=0.01,
        liquidity=50_000,
        observed_at=datetime(2026, 9, 9, tzinfo=UTC),
    )
    candidate = SignalCandidate(
        fair_probability=0.60,
        confidence=0.80,
        evidence_ids=["news-1"],
    )
    policy = RiskPolicy(max_market_fraction=0.01)

    decision = evaluate_signal(
        candidate,
        market,
        policy,
        bankroll=10_000,
        existing_market_exposure=100,
    )

    assert decision.action == "AVOID"
    assert "market exposure" in decision.limitations[0]
