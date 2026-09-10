# Hono monorepo and Python calculation service

## Goal

Make Hono the public API for Polylove while keeping Python responsible for deterministic calculations. Organize the repository as an npm workspace so the web app, API gateway, and shared contracts have explicit package boundaries.

## Package layout

```
apps/
  web/                 React + Vite terminal UI
  api/                 Hono public API + Python calculation runtime
packages/
  contracts/           TypeScript API types and validators
  ui/                  shadcn-style reusable UI primitives
```

The root `package.json` will enable npm workspaces and expose development, test, type-check, and build commands for the API and web app. Python remains independently managed by `pyproject.toml` and the existing virtual environment, but is part of `apps/api` rather than a separately deployable public service.

## Public API boundary

`apps/api` owns public Hono routes under `/api/v1` and serves as the only frontend API origin. It will:

- fetch and normalize the public Gamma market payload;
- cache successful Top-50 active market responses for 30 seconds;
- return the cached response with `data_freshness: "stale"` when Gamma fails;
- execute calculation requests through a private Python runtime adapter;
- validate query parameters and apply CORS for local web development.

The existing market response shape is preserved: `items`, `as_of`, and `data_freshness`, with each market containing the live fields already consumed by the terminal.

## Python calculation runtime

The Python source lives alongside the Hono service under `apps/api/python`. It is not a public server and exposes no public routes. The Hono API starts and communicates with it through a private runtime adapter, initially a short-lived process invocation with JSON input/output:

- forecast baseline and feature calculation;
- risk/position-size calculation;
- paper order fill simulation.

Python receives normalized market values from Hono; it does not fetch Gamma directly. This leaves numerical logic, `Decimal` arithmetic, and risk rules in Python while HTTP transport, caching, and contracts stay in TypeScript. If the private calculation invocation fails, Hono returns a safe `503` only for calculation requests; market browsing remains available.

## shadcn-style UI package

`packages/ui` provides local, dependency-light primitives using the shadcn pattern: composable React components with source in the repository. The first slice includes `Button`, `Badge`, `Card`, and `Table` primitives. The terminal dashboard consumes these primitives rather than adding a runtime UI kit or copying third-party branding/assets.

## Testing and failure behavior

- Gateway tests use mocked `fetch` and prove Gamma normalization, liquidity sort/limit, and stale-cache fallback.
- Python tests cover calculation inputs/outputs and paper behavior without network access.
- Web tests retain language and dock behavior and verify TypeScript contracts compile.
- If Python is unavailable, calculation routes return a safe `503` response; market browsing remains available from the same Hono API.

## Local development

```
npm run api:dev
npm run dev
```

The web app uses `VITE_API_URL=http://localhost:8787` in development. No API or web service is placed back into Docker; PostgreSQL remains optional through the existing compose file.
