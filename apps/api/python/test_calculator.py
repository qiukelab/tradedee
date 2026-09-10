from python.calculator import calculate_forecast


def test_calculate_forecast_returns_market_baseline_with_limitations() -> None:
    forecast = calculate_forecast({"market_probability": 0.62})

    assert forecast["market_probability"] == 0.62
    assert forecast["fair_probability"] is None
    assert forecast["limitations"]
