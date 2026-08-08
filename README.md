# nokori

**Turn what's left into what's learned.**

Mobile-first food waste tracking for food trucks, cafes, bakeries, and small restaurants. Log waste
in under 30 seconds, see what it cost in dollars, and get one plain-English prep recommendation a
week.

This repository is the MVP slice of the PRD: everything a pilot business needs to log waste and read
a weekly report. Monetization, photos, staff accounts, offline sync, and push notifications are
deliberately **not** here yet — see [Not built yet](#not-built-yet).

```
nokori-v1/
├── backend/   Java 21 · Spring Boot 3.5 · PostgreSQL · Flyway
└── mobile/    React Native · Expo SDK 57 · Expo Router · TanStack Query
```

---

## Quick start

**Prerequisites:** JDK 21+, Maven, PostgreSQL 14+, Node 20+.

### 1. Database

```bash
createdb nokori_dev && createdb nokori_test
```

### 2. Backend

```bash
cd backend && mvn spring-boot:run
```

Runs on `http://localhost:8080`. Flyway creates the schema on first boot.

To boot with a demo business, seven items, and three weeks of waste history — useful on a fresh
database, and what App Review needs to see:

```bash
NOKORI_DEMO_ENABLED=true mvn spring-boot:run
```

That creates `demo@nokori.app` / `NokoriDemo123!`.

### 3. Mobile

```bash
cd mobile && npx expo start
```

Press `i` for the iOS simulator, `a` for Android, or `w` for the browser. On a physical device, point
the app at your machine instead of localhost:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:8080 npx expo start
```

### 4. Tests

```bash
cd backend && mvn test
```

35 tests: cost math, timezone week windows, recommendation rules, and integration tests that prove
one business cannot read another's data.

---

## What's built

| PRD | Feature | Status |
| --- | --- | --- |
| F-001 | Auth — register, login, refresh, `/auth/me`, in-app account deletion | ✅ |
| F-002 | Business profile with IANA timezone driving every week boundary | ✅ |
| F-003 | Inventory CRUD, soft delete, per-business-type starter templates | ✅ |
| F-004 | Waste log with server-side cost math and cost snapshotting | ✅ |
| F-005 | Dashboard: weekly total, projection, top item, worst day, top reason | ✅ |
| F-006 | Filterable, paginated history | ✅ |
| F-007 | Weekly report with frozen snapshots and a scheduler | ✅ |
| F-008 | CSV export (UTF-8 BOM, opens cleanly in Excel) | ✅ |
| F-010 | Rule-based prep recommendations | ✅ |
| F-012 | Idempotency keys on waste entries (the server half of offline sync) | ◐ |

### Not built yet

F-009 photos, F-011 staff roles, F-012 the client-side offline queue, F-013 subscriptions and the
paywall, F-014 push notifications. The schema already carries `photo_key` and `client_uuid` so those
land without a migration rewrite.

---

## Design decisions worth knowing

**Weeks are business-local, not server-local.** `waste_entries.waste_date` is a `DATE` in the
business's own timezone, so week math is pure `LocalDate` arithmetic and never depends on where the
server runs. A truck in Irvine and one in Miami both get Monday 00:00 to Sunday 23:59 in their own
time.

**Cost is computed server-side and snapshotted.** The client never sends a dollar amount. Each entry
stores `cost_per_unit_at_time`, so repricing an item next month does not rewrite last month's report.

**Tenant isolation is a single choke point.** `BusinessAccess` turns the JWT into a business id, and
every query pairs the row id with that business id — `findByIdAndBusinessId`, never `findById`.
Cross-business access returns 404, not 403, so ids can't be probed. `TenantIsolationIntegrationTest`
asserts this on every business-scoped endpoint (OWASP API1:2023, PRD §11).

**Closed weeks are frozen.** Once a week ends, its headline numbers and recommendation are written to
`weekly_report_snapshots`, so a report an owner read on Monday still says the same thing in March.
The scheduler runs hourly rather than weekly so it lands just after midnight in every timezone and
self-heals a missed run. Chart detail is recomputed live and marked with `fromSnapshot`.

**Recommendations are rules, not ML.** `RecommendationEngine` evaluates ordered rules and the first
match wins. The day-specific rule is checked before the repeat-item rule so "tortillas, two Fridays
running" produces *"Prep 10-15% less Corn tortillas next Friday"* rather than a generic sentence.
Under 10 entries in the trailing four weeks, it says so instead of guessing.

**Items are soft-deleted only when they have history.** An item you logged against goes
`active = false` — gone from the picker, still in reports. An item you added by mistake is deleted
outright.

---

## API

All endpoints except `/auth/register`, `/auth/login`, `/auth/refresh`, and `/actuator/health` require
`Authorization: Bearer <accessToken>`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me` · `DELETE /auth/me` |
| Business | `POST /businesses` · `GET /businesses/me` · `PUT /businesses/me` |
| Inventory | `GET/POST /inventory` · `PUT/DELETE /inventory/{id}` |
| Waste | `POST/GET /waste-entries` · `PUT/DELETE /waste-entries/{id}` |
| Dashboard | `GET /dashboard/summary` · `/top-items` · `/by-reason` · `/by-day` |
| Reports | `GET /reports/weekly?weeksAgo=1` |
| Export | `GET /exports/waste.csv?from=&to=` |
| Ops | `GET /actuator/health` |

Errors are uniform: `{"code": "item_inactive", "message": "…", "fieldErrors": {…}}`. The client
branches on `code`; `business_required` means "route to onboarding."

### Try it end to end

```bash
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@nokori.app","password":"NokoriDemo123!"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')
curl -s localhost:8080/dashboard/summary -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `NOKORI_DB_URL` | `jdbc:postgresql://localhost:5432/nokori_dev` | |
| `NOKORI_DB_USER` / `NOKORI_DB_PASSWORD` | current shell user / empty | |
| `NOKORI_JWT_SECRET` | dev-only fallback | **Must** be set in production; 32+ bytes. Boot fails if shorter. |
| `NOKORI_CORS_ORIGINS` | `localhost:8081,localhost:19006` | Expo dev servers |
| `NOKORI_DEMO_ENABLED` | `false` | Seeds the demo/reviewer account |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080` | Mobile → API. Android emulators are rewritten to `10.0.2.2` automatically. |

Tests read `NOKORI_TEST_DB_URL` (default `nokori_test`) — point it at a service container in CI.

---

## Next steps

1. **Pilot the flow.** Run the demo seed, log entries for a week, and check whether the Monday report
   actually changes a prep decision. That is the thing the PRD says to validate before more code.
2. **Deploy the backend** (Render/Railway + managed Postgres) so TestFlight builds have something to
   talk to.
3. **F-013 subscriptions** — RevenueCat webhook → `subscriptions` table → backend entitlement checks.
   Gate on the server, never only in the UI.
4. **F-012 offline queue** — the server side is done; the client needs the `expo-sqlite` queue and a
   NetInfo-driven sync worker that replays with the same `clientUuid`.
5. **F-014 push** — the weekly-report notification is the retention lever the PRD calls out; wire it
   into the same scheduler that writes snapshots.
