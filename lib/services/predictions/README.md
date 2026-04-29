# When Will I Listen? — Predictions

## Overview

Predicts the user's most likely listening time and genre for the current day using **deterministic statistical heuristics**. No ML libraries. AI is used only to explain the result, not to compute it.

## Architecture

```
listening-habit-heuristics.ts  → Pure functions (testable, no I/O)
listening-habit-service.ts    → Fetches DB data, calls heuristics
prediction-cache.ts           → Redis + in-memory fallback
```

## Heuristics (Assumptions & Limitations)

1. **Same day of week**: Users have recurring weekly patterns. Monday habits differ from Saturday. We filter to the same weekday as today.

2. **2-hour time window**: Typical listening sessions span 1–2 hours. We find the peak hour and expand to a 2-hour window to capture the habit.

3. **Confidence score**: `(listens in window / total listens on that weekday) × 100`. Capped at 95% to avoid overconfidence from sparse data.

4. **Genre**: Most frequent genre in the predicted time window. Uses `track.genre` (Last.fm) with artist fallback. Null/Unknown reduces quality.

5. **Minimum data**: 30 listens required. Below that, we return "insufficient data".

6. **Lookback**: 90 days of history by default.

## API

- `GET /api/predictions/listening-habit` — Returns prediction or insufficient data
- `GET /api/predictions/listening-habit?explain=true` — Adds AI explanation (requires `GROQ_API_KEY`)

## Caching

- Predictions: cached per day, per user. Invalidates at midnight.
- AI explanations: cached by hash of prediction output. Same prediction → same explanation.

## Confidence Score Meaning

The confidence score represents: **what proportion of your historical listens (on this weekday) fall within the predicted time window**. Higher = more consistent habit. E.g. 65% means 65% of your Monday listens (historically) were in that 2-hour window.
