# Polylove — a little friend for big market stories

## Direction

Keep the original Poly mascot and SVG illustration world. Soft, adult-friendly, warm and approachable. Use a narrative landing page, not a trading terminal. Poly is a guide, not an investment authority.

## Tokens

- Paper #fcfaf5, ink #223d58, secondary text #576775.
- Action blue #345f91, pastel blue #e8eff7, sage #eff4f0, cream #f3eee0.
- DM Sans + Noto Sans Thai. Body line height 1.85; headline 34–53px.
- Content width 1180px, gutters 32px desktop / 20px mobile.
- Rounded 18–24px story surfaces. Dashed separators indicate a reading path.
- Small angular notebook illustration accents; no animated ticker urgency.

## Components

Reuse Buddy and StoryWorld from beginner/illustrations.tsx. Shared PolyNote explains next steps. Mascot appears in brand, hero, registration, member guidance and waiting states. Story tabs teach news → activity → conditional plans, with keyboard arrows/Home/End.

Use native forms, details and controls; shared local Button/Card primitives. Graphs display real closed-candle data with a textual range. Public story blocks show no more than three news/analysis cards.

Admin can be denser, with labeled tables and forms, while retaining the same color/type system. Do not use mascot speech for provider secrets, internal configuration or unsupported claims.

## Verification

Edge screenshots in apps/web/artifacts. Axe checks desktop, registration and account; inspect both mobile reflow and keyboard navigation. Respect reduced motion and keep all mascot artwork decorative to assistive technology.
