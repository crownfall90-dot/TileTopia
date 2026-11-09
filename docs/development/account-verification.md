# Account verification
Source: b2ddbac0b92cfee4d6e0cb3fbc2c84a3312b5dae
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text

  duration_ms: 0.366824
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 249 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.530883
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 250 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.182987
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 251 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.364461
  ...
# Subtest: ui/inbox: items definition, unread count and rendering
ok 252 - ui/inbox: items definition, unread count and rendering
  ---
  duration_ms: 8.104874
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 253 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.426076
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
ok 254 - ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
  ---
  duration_ms: 0.346314
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 255 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.168325
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 256 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.249998
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 257 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.384763
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 258 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.327565
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 259 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.312583
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 260 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 16.976106
  ...
# Subtest: ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
ok 261 - ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
  ---
  duration_ms: 8.554243
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 262 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.46135
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 263 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.339173
  ...
# Subtest: ui/setup: profileName and hero meta
ok 264 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.315507
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 265 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.217639
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 266 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.454097
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 267 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 11.730239
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
ok 268 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
  ---
  duration_ms: 5.115283
  ...
# Subtest: usage: what was tapped becomes a stable id
ok 269 - usage: what was tapped becomes a stable id
  ---
  duration_ms: 11.749234
  ...
# Subtest: usage: counters are per day, capped, and sent only when something changed
ok 270 - usage: counters are per day, capped, and sent only when something changed
  ---
  duration_ms: 4.153389
  ...
# Subtest: usage: the owner sees players, shares, the most used and the unused
ok 271 - usage: the owner sees players, shares, the most used and the unused
  ---
  duration_ms: 1.173954
  ...
# Subtest: usage: the database rules accept exactly what the game sends
ok 272 - usage: the database rules accept exactly what the game sends
  ---
  duration_ms: 1.326906
  ...
# Subtest: consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
ok 273 - consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
  ---
  duration_ms: 6.660329
  ...
# Subtest: consent window: a short plain reason, and the exact list of what is collected one tap away
ok 274 - consent window: a short plain reason, and the exact list of what is collected one tap away
  ---
  duration_ms: 3.637659
  ...
# Subtest: vibration has its own switch in the sound group and is on by default
ok 275 - vibration has its own switch in the sound group and is on by default
  ---
  duration_ms: 4.877354
  ...
# Subtest: every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding
ok 276 - every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding
  ---
  duration_ms: 4.291849
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 277 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.27667
  ...
1..277
# tests 277
# suites 0
# pass 253
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 3445.649081

```
## build
```text

BUILD SUCCESSFUL in 1m 17s
46 actionable tasks: 46 executed
```
