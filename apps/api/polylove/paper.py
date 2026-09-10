from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal


@dataclass(frozen=True)
class PaperOrder:
    market_id: str
    outcome: str
    side: Literal["BUY", "SELL"]
    quantity: Decimal


@dataclass(frozen=True)
class PaperFill:
    market_id: str
    outcome: str
    quantity: Decimal
    fill_price: Decimal
    status: Literal["FILLED", "PARTIALLY_FILLED"]


@dataclass
class Position:
    quantity: Decimal = Decimal("0")
    average_price: Decimal = Decimal("0")


class PaperLedger:
    """In-memory reference ledger; persistence is supplied by the repository adapter."""

    def __init__(self, *, starting_cash: Decimal) -> None:
        self.cash = starting_cash
        self._positions: dict[tuple[str, str], Position] = {}

    def position(self, market_id: str, outcome: str) -> Position:
        return self._positions.setdefault((market_id, outcome), Position())

    def submit(
        self,
        order: PaperOrder,
        *,
        bid: Decimal,
        ask: Decimal,
        available_depth: Decimal,
    ) -> PaperFill:
        if order.quantity <= 0 or available_depth <= 0:
            raise ValueError("quantity and available_depth must be positive")
        quantity = min(order.quantity, available_depth)
        status: Literal["FILLED", "PARTIALLY_FILLED"] = (
            "FILLED" if quantity == order.quantity else "PARTIALLY_FILLED"
        )
        base_price = ask if order.side == "BUY" else bid
        slippage = Decimal("0.0005")
        fill_price = base_price + slippage if order.side == "BUY" else base_price - slippage
        position = self.position(order.market_id, order.outcome)
        if order.side == "BUY":
            new_quantity = position.quantity + quantity
            position.average_price = (
                (position.average_price * position.quantity + fill_price * quantity) / new_quantity
            )
            position.quantity = new_quantity
            self.cash -= fill_price * quantity
        else:
            if quantity > position.quantity:
                raise ValueError("cannot sell more than the paper position")
            position.quantity -= quantity
            self.cash += fill_price * quantity
        return PaperFill(order.market_id, order.outcome, quantity, fill_price, status)
