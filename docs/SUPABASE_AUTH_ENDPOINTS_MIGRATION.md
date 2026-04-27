# Supabase Auth - API Endpoints Migration Map

Reference file for Phase 3 migration (`query userId` -> Supabase session user).

## Already migrated

- `app/api/replay/route.ts`

## Core dashboard endpoints to migrate

- `app/api/overview/route.ts`
- `app/api/listens/route.ts`
- `app/api/genres/route.ts`
- `app/api/date-range/route.ts`
- `app/api/timeline/route.ts`
- `app/api/temporal-analysis/route.ts`
- `app/api/artists/route.ts`
- `app/api/artists/trends/route.ts`
- `app/api/artists/trends-chart/route.ts`
- `app/api/genres/trends/route.ts`

## AI / prediction endpoints to migrate

- `app/api/analytics/taste-evolution/route.ts`
- `app/api/ai/artist-trends-commentary/route.ts`
- `app/api/ai/genre-trends-commentary/route.ts`

## Export endpoints to migrate

- `app/api/export/listens/route.ts`
- `app/api/export/stats/route.ts`
- `app/api/export/report/route.ts`

## Special import endpoints (decision required)

These currently accept `userId` from request body and are used by scripts.

- `app/api/replay/import/route.ts`
- `app/api/lastfm/import/route.ts`

## Special import endpoints status (implemented)

- `app/api/replay/import/route.ts`
- `app/api/lastfm/import/route.ts`

Behavior:

- Default mode: authenticated Supabase session user is used.
- Script/admin mode: `x-import-admin-key` + `IMPORT_ADMIN_KEY` env allows body `userId`.
- Without session and without valid admin key: `401 Authentication required`.
