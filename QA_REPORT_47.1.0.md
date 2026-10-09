# QA report — APEX RUSH 47.1.0

Date: 2026-10-09 (Asia/Seoul).
Story: Create/select room → authenticated JSON API → authoritative room/race state → SSE snapshot → lobby/race UI.

## Result

`npm test`: 20/20 automated tests PASS, plus JS syntax, unique HTML IDs, script existence, finite 16-player lane reset, mode isolation, Korean IME controls and all 15 track geometries.
Local HTTP load: 30 clients / 3 rooms / 30 SSE connections / 150 input requests. Final run p95 request latency 28.9 ms. Short local smoke test only; this does not establish production capacity or sustained performance.

## Reproduced bugs and fixes

| Bug | Evidence before fix | Fix / regression |
|---|---|---|
| All clients briefly disconnect | phase became done after 100 ms | 15 s disconnect grace; chaos test |
| Empty room remains | rooms.size remained 1 after final leave | immediate removal; chaos test |
| Expired room discovery | expired room returned by list | active phases only; chaos test |
| Orphan reconnect token | dropped roster token could remain authenticated | invalidate omitted members at start; chaos test |
| More than six rivals | fixed six-slot lane array returns undefined | target lane / parity fallback; 15-rival executable check |
| Cancelled countdown UI | updateOnline returned while UI remained racing | restore landing/lobby, unlock garage, clear input; real browser disconnect |
| Restart reconnection loop | old SSE token kept retrying forever | session validity probe, clear ticket, offer restart; mocked network + real local server restart |

## Dynamic browser checks (cua Playwright API)

- Saved private room with capacity 3 / NEON INFINITY 8 / 1 lap: PASS.
- Private room omitted from public room list: PASS.
- Invalid invitation rejected; correct code joins and redirects to level 10: PASS.
- Host starts after both ready: PASS.
- Guest tab closed during countdown → host returns to waiting lobby: PASS.
- QA-only server restarted → recovery message → next-race button joins fresh room: PASS.
- Single mode: 6 AI rivals, 3 laps; keyboard driving reached 215 km/h: PASS.
- Browser console: no uncaught JS errors. Expected Three.js texture resize warnings observed.
- Screenshot evidence: qa-restart-proof.png. Production evidence recorded after release.

## Limits

- Browser viewport override request did not change reported innerWidth (1280 px). Mobile-width validation was not achieved; no all-device compatibility claim.
- Real WAN 30-player sustained load, packet loss/latency injection and multiple physical devices remain untested.
- No destructive chaos was run on production. Fault injection used isolated localhost:8089.
- Render memory state resets on restart; this release offers recovery, not durable ongoing race restoration.

## Repeatable checks

npm test
npm run test:static
npm run test:chaos
npm run test:load

Browser procedure: create private 3-player / track 11 / 1-lap room; second tab joins via code; ready both; start and close guest before countdown ends; verify lobby return. Restart the QA server, verify recovery notice and successful rejoin. Start single race and hold Up.
