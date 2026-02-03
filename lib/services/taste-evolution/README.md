# Taste Evolution Service

Week-to-week taste evolution analysis. All trend detection is **deterministic**; AI is used only for narrative commentary.

## Analytical Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Week definition | ISO (Monday start) | Aligns with PostgreSQL `DATE_TRUNC('week', ...)` |
| Genre delta threshold | 2 percentage points | Filters noise; smaller changes are ignored |
| Min listens per week | 10 | Below this, diversity metrics are unreliable |
| Top artists N | 15 | Rank movements beyond top 15 are noisy |
| Rank change threshold | 1 position | Ignore trivial rank fluctuations |

## Trend Classifications

- **expansion**: Genre count ↑ AND entropy ↑
- **consolidation**: Genre count ↓ AND entropy ↓
- **exploration**: New genres in top distribution OR new artists in top N
- **regression**: Previously declining genres/artists return
- **stable**: None of the above

## Limitations

- Short-term patterns (e.g. holiday spikes) can dominate weekly analysis
- Genre data quality depends on `track.genre` and `ARTIST_TO_GENRE_MAP`
- Week boundaries may split listening sessions arbitrarily
