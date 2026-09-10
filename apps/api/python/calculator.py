"""JSON-lines calculation entry point invoked privately by the Hono API."""

from __future__ import annotations

import json
import sys


def calculate_forecast(payload: dict[str, object]) -> dict[str, object]:
    probability = float(payload["market_probability"])
    if not 0 < probability < 1:
        raise ValueError("market_probability must be between zero and one")
    return {
        "market_probability": probability,
        "fair_probability": None,
        "limitations": ["A calibrated fair-value forecast is not available yet."],
    }


if __name__ == "__main__":
    try:
        print(json.dumps(calculate_forecast(json.loads(sys.stdin.read()))))
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"detail": str(error)}))
        raise SystemExit(2)
