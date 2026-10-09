# Changelog

## 47.1.0 — 2026-10-09

QA and fault recovery release following room battles (47.0 feature set).

- Fix non-finite rival lane positions when more than six opponents are present.
- Restore the lobby when a countdown is cancelled after a participant disconnects.
- Preserve active races through brief all-player disconnection with a 15-second grace period.
- Detect invalid sessions after server restart; clear the ticket and offer rejoin.
- Remove disconnected participants' stale tokens when locking the race roster.
- Remove empty waiting rooms immediately; hide expired/completed rooms from discovery.
- Add 20 automated server/client/integration/load tests and static checks.
- Verify private invite flow, selected-course redirect, countdown cancellation, restart recovery and single driving with the browser Playwright API.

## 47.0 feature set — 2026-10-09

Independent public/private battle rooms, host authority, readiness, 2–16 player capacity, 1–5 laps, 15 selectable circuits and saved room defaults.

## 46.0.0

Single-vs-AI and global matchmaking with the initial Render backend deployment.
