from decimal import Decimal

from polylove.paper import PaperLedger, PaperOrder


def test_paper_buy_fills_at_ask_with_slippage_and_updates_position() -> None:
    ledger = PaperLedger(starting_cash=Decimal("1000"))

    fill = ledger.submit(
        PaperOrder(market_id="btc-100k", outcome="YES", side="BUY", quantity=Decimal("10")),
        bid=Decimal("0.50"),
        ask=Decimal("0.52"),
        available_depth=Decimal("20"),
    )

    assert fill.fill_price == Decimal("0.5205")
    assert ledger.position("btc-100k", "YES").quantity == Decimal("10")
    assert ledger.cash == Decimal("994.795")


def test_paper_order_partially_fills_when_depth_is_smaller_than_quantity() -> None:
    ledger = PaperLedger(starting_cash=Decimal("1000"))

    fill = ledger.submit(
        PaperOrder(market_id="btc-100k", outcome="YES", side="BUY", quantity=Decimal("10")),
        bid=Decimal("0.50"),
        ask=Decimal("0.52"),
        available_depth=Decimal("4"),
    )

    assert fill.quantity == Decimal("4")
    assert fill.status == "PARTIALLY_FILLED"
