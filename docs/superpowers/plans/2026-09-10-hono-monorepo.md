# Hono monorepo implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public FastAPI market API with one Hono API package while retaining Python-only calculation code and adding local shadcn-style UI packages.

**Architecture:** `apps/api` is a Hono server that owns Gamma data, cache, validation, and CORS. Python code is moved under `apps/api/python` and invoked by a Hono runtime adapter for calculation routes. `packages/contracts` shares TypeScript market shapes and `packages/ui` supplies composable UI primitives to the React terminal.

**Tech Stack:** Hono, Node.js, TypeScript, Vitest, React 19, Vite, Python 3.12, FastAPI-free calculation modules.

**Spec:** `docs/superpowers/specs/2026-09-10-hono-monorepo-design.md`

## Global Constraints

- Hono is the only public API origin on port 8787.
- Gamma responses cache for 30 seconds and return `data_freshness: "stale"` from a successful prior response on upstream failure.
- Python is private calculation code, never a public HTTP server.
- Preserve `/api/v1/markets` response fields consumed by the terminal.
- UI uses local shadcn-style source primitives and no third-party brand assets.

---

### Task 1: Workspace contracts and package boundaries

**Files:**
- Modify: `package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/src/markets.ts`
- Create: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/markets.test.ts`

**Interfaces:**
- Produces `Market` and `MarketsResponse` TypeScript types for Hono and web.

- [ ] Write a failing contract test asserting a market response requires `items`, `as_of`, and `data_freshness`.
- [ ] Run `npm test --workspace @polylove/contracts` and confirm failure because the package does not exist.
- [ ] Add npm workspaces and a contracts package containing the exported types.
- [ ] Run `npm test --workspace @polylove/contracts` and confirm it passes.

### Task 2: Hono market API and cache

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/src/markets.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/index.ts`
- Test: `apps/api/src/markets.test.ts`
- Test: `apps/api/src/app.test.ts`

**Interfaces:**
- Consumes `Market` and `MarketsResponse` from `@polylove/contracts`.
- Produces `createApp(dependencies)` and `GammaMarketCache.list(limit)`.

- [ ] Write failing tests for normalization, liquidity sort/50-item limit, and stale cache after an upstream exception.
- [ ] Run `npm test --workspace @polylove/api` and confirm these tests fail before implementation.
- [ ] Implement Gamma parsing, 30-second cache, CORS, `GET /health`, and `GET /api/v1/markets`.
- [ ] Run `npm test --workspace @polylove/api` and confirm all gateway tests pass.

### Task 3: Private Python calculation runtime

**Files:**
- Create: `apps/api/python/calculator.py`
- Create: `apps/api/src/calculator.ts`
- Test: `apps/api/python/test_calculator.py`
- Test: `apps/api/src/calculator.test.ts`

**Interfaces:**
- Consumes normalized `Market` JSON.
- Produces `calculateForecast({ market_probability })` JSON with a safe baseline probability and limitations.

- [ ] Write a failing Python test for a valid forecast calculation and a failing Hono test for its calculation adapter response.
- [ ] Run the Python and API test commands and confirm each fails because the calculator is absent.
- [ ] Implement the JSON-lines Python calculator and the Hono process adapter; return HTTP 503 for calculation invocation failures.
- [ ] Run the targeted tests and confirm both pass.

### Task 4: Local shadcn-style UI package and client migration

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/src/button.tsx`
- Create: `packages/ui/src/card.tsx`
- Create: `packages/ui/src/badge.tsx`
- Create: `packages/ui/src/index.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `packages/ui/src/button.test.ts`

**Interfaces:**
- Consumes shared market types from `@polylove/contracts`.
- Produces `Button`, `Card`, and `Badge` React primitives.

- [ ] Write a failing UI-package unit test for Button class composition.
- [ ] Run `npm test --workspace @polylove/ui` and confirm it fails before the package exists.
- [ ] Implement source-owned UI primitives and migrate terminal buttons/badges/cards to them.
- [ ] Point default Vite API URL at `http://localhost:8787` and run web type-check/build.

### Task 5: Remove public FastAPI surface and document commands

**Files:**
- Delete: `apps/api/polylove/app.py`
- Modify: `README.md`
- Modify: `.env.example`
- Test: existing Python calculation tests under `apps/api/tests`

**Interfaces:**
- Hono becomes the sole public API; Python modules remain importable for calculations.

- [ ] Update Python tests to import calculation modules rather than FastAPI routes.
- [ ] Remove the FastAPI app and its public HTTP tests.
- [ ] Document `npm run api:dev` and `npm run dev`.
- [ ] Run Python tests, all npm tests, TypeScript checks, and production builds.
