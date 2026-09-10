import test from "node:test";
import assert from "node:assert/strict";

import { buttonClassName } from "./button.js";

test("composes the local shadcn-style button classes", () => {
  assert.equal(buttonClassName("primary", "extra"), "ui-button ui-button-primary extra");
});
