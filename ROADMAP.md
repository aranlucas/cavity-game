# Feature roadmap

Planning baseline: `1aedd1f020d9` on `origin/main`, 2026-10-26. Games follow the portfolio's Digits/MCP priorities.

## Outcome

Help a new player finish a relaxed clinic day and choose to return. [Little Smiles](README.md) already has three fictional patients, five treatment stages, local saves, comfort and heat mechanics, and a sticker album.

## 1. A first appointment that teaches itself

Add a short optional guided appointment that introduces one control and one stage at a time. Keep guidance contextual and dismissible, with equal keyboard and touch paths.

Acceptance:

- A new player can find the chair, choose the correct tool and finish the appointment without outside explanation.
- Heat and comfort feedback explains the next useful action.
- Pausing, leaving and resuming retains the appropriate guidance state.
- Experienced players can skip guidance without losing progress.

Observe a few voluntary play sessions. Note where players stop or ask for help; do not add gameplay analytics.

## 2. Give the clinic day a satisfying finish

Expand the existing completion moment with a readable recap of patients helped and stickers earned. Offer a deliberate replay choice, avoiding pressure from streaks or timers.

Acceptance: the recap agrees with saved progress, handles unavailable storage honestly and remains usable with reduced motion and sound off.

## 3. One carefully tested appointment variation

Add a small variation in targets or patient preferences only after the first-day loop is understandable. Keep existing saves compatible and the clinical sequence explicitly fictional.

## Boundaries

No multiplayer backend, accounts, live AI or medical-training claims are needed. The anatomy and care mechanics remain simplified fiction. Use the existing deterministic rules and test runner, and preserve accessible controls. The value signal is enjoyable voluntary replay, not session length or a larger asset count.
