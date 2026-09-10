# Polylove — ค่อย ๆ เข้าใจตลาดไปด้วยกัน

## Audience and experience

Thai beginners following BTC/ETH/SOL Spot over hours to a few days. Poly, the existing abstract blue SVG mascot, introduces news, market activity and conditional plans in a friendly story. Retain the original warm-white/navy/soft-blue visual character.

Landing sequence: Poly introduction → three interactive reading questions → current market cards → sourced news and reviewed analyses → signup invitation. No invented prices or claims of profitable signals. Missing data has a clear waiting state with Poly; errors are separate from empty data.

Members register through Email/password or Google, follow coins, review analyses, set five price alerts and optionally connect Telegram. Account linking is explicit. Unverified accounts cannot access member resources. Admin reviews drafts, news, users, settings, jobs and budgets.

## Data truth

Binance Spot price and closed OHLCV candles; prices are in USDT, not USD. Show source timestamps. Older than two minutes is stale and cannot trigger price alerts. News is admin-authored or imported from a licensed feed. AI only receives market/news data; numerical plans come from code.

Draft → review → published. Expired, withdrawn or invalidated plans are clearly labeled. No win-rate percentages until separately calibrated and tested.

## Scope

No Polymarket in current routes. No real orders, custody, payments or personalized portfolio advice. Legacy source remains unmounted. UI is Thai. Warm narrative language must explain rather than encourage urgency or trading.

## Budget revision — admin-assisted daily analysis

Update: the user selected a new private Polylove MCP for the administrator instead of manual transfer. See [admin MCP implementation and remaining release gates](docs/admin-mcp.md). The export/import narrative below describes the earlier proposal; MCP tools now provide the intended data/draft transfer. Human review and no per-member model calls remain unchanged.

Revised MVP plan (2026-09-10): start with an administrator using ChatGPT manually to prepare one shared daily market brief. This replaces the planned automatic four-hour AI drafting cadence for initial launch; it does not change live market ingestion, deterministic indicators, account security or price alerts. This section is a plan, not a claim that export/import controls have been implemented or that running settings have changed.

Daily workflow:

1. Admin selects licensed news and exports a timestamped package of BTC/ETH/SOL prices, computed indicators, conditional plan numbers, source IDs/URLs and a reusable writing prompt. Exclude member data, credentials and private account information.
2. Admin gives the package to ChatGPT. Stable instructions and examples of reviewed writing guide tone and format; fresh daily data supplies context. This is not daily model training and does not guarantee learning or improved forecasting.
3. Admin imports the response as a draft linked to the original package. Accept narrative fields only; validate source IDs and never replace server-calculated price levels with generated numbers.
4. Before publication, recheck freshness, plan expiry and crossed-entry evidence. Reject an obsolete package and prepare a new one when needed. Record the reviewer and revision; editing a published article requires approval again.
5. All members read the same approved content. Visits do not trigger model requests. If the admin skips a day, retain dated historical briefs and clearly show no current plan rather than extending its validity.

Planned admin additions: “เตรียมข้อมูลให้ GPT”, a copyable prompt/data package, “นำเข้าร่างบทวิเคราะห์”, validation feedback and the existing review/publish flow. Keep automatic paid AI disabled for this mode; do not silently fall back to a paid provider. Existing automatic AI code can remain optional.

Cost boundary: manual copy/paste creates no application-side model API calls, but ChatGPT account pricing/usage limits and administrator time still apply. Hosting, database, email and backups remain in the budget. Do not promise unlimited or zero-cost ChatGPT access. Start with manual transfer; optionally evaluate authenticated GPT Actions for fetching packages/submitting drafts later. Actions must never publish directly or expose admin credentials to members. An unattended server-side model integration is a separate API implementation and cost decision.

Acceptance checks for this revision: package excludes secrets/member data; import rejects unknown sources and modified numerical plans; stale/crossed/expired packages cannot publish as active plans; draft remains private until approval; no model network call occurs on export, import or member reads; published content records its data time and reviewer. Real ChatGPT-assisted editorial rehearsal is still required before launch.

Official references: [context versus training](https://developers.openai.com/api/docs/guides/model-optimization), [GPT Actions](https://developers.openai.com/api/docs/actions/introduction), [API usage pricing](https://developers.openai.com/api/docs/pricing).

## Accounts

Email/password + verified Google. Passwords use Argon2id. Email verification and reset links require explicit POST confirmation, not GET consumption. One user can link both methods after proving control. Admin cannot bypass email verification or reveal/reset member passwords.

## Accessibility

Responsive at 390px and desktop. Keyboard-controlled story tabs, visible focus, labeled forms, password managers and reduced motion. Poly never pops up over content or interrupts a task.
