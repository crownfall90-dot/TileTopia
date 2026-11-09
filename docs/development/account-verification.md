# Account verification
Source: c17aa2cdf5878252800235886ecef04b9d97db58
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
  duration_ms: 0.560533
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 252 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.636148
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 253 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.261959
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 254 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.474017
  ...
# Subtest: ui/inbox: items definition, unread count and rendering
ok 255 - ui/inbox: items definition, unread count and rendering
  ---
  duration_ms: 12.010181
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 256 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.452934
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
ok 257 - ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
  ---
  duration_ms: 0.195342
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 258 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.190949
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 259 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.265402
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 260 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.851832
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 261 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.434813
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 262 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.378209
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 263 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 20.164142
  ...
# Subtest: ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
ok 264 - ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
  ---
  duration_ms: 13.715131
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 265 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.140695
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 266 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.254837
  ...
# Subtest: ui/setup: profileName and hero meta
ok 267 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.295751
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 268 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.230726
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 269 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.403762
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 270 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 10.938531
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
ok 271 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
  ---
  duration_ms: 5.405817
  ...
# Subtest: usage: what was tapped becomes a stable id
ok 272 - usage: what was tapped becomes a stable id
  ---
  duration_ms: 13.732215
  ...
# Subtest: usage: counters are per day, capped, and sent only when something changed
ok 273 - usage: counters are per day, capped, and sent only when something changed
  ---
  duration_ms: 4.401369
  ...
# Subtest: usage: the owner sees players, shares, the most used and the unused
ok 274 - usage: the owner sees players, shares, the most used and the unused
  ---
  duration_ms: 3.188147
  ...
# Subtest: usage: the database rules accept exactly what the game sends
ok 275 - usage: the database rules accept exactly what the game sends
  ---
  duration_ms: 0.935193
  ...
# Subtest: consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
ok 276 - consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
  ---
  duration_ms: 7.625014
  ...
# Subtest: consent window: a short plain reason, and the exact list of what is collected one tap away
ok 277 - consent window: a short plain reason, and the exact list of what is collected one tap away
  ---
  duration_ms: 4.04103
  ...
# Subtest: vibration has its own switch in the sound group and is on by default
ok 278 - vibration has its own switch in the sound group and is on by default
  ---
  duration_ms: 5.26394
  ...
# Subtest: every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding
ok 279 - every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding
  ---
  duration_ms: 4.76067
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 280 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.491635
  ...
1..280
# tests 280
# suites 0
# pass 256
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 3543.797652

```
## build
```text

BUILD SUCCESSFUL in 1m 23s
46 actionable tasks: 46 executed
```
