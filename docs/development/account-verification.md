# Account verification
Source: 3ba78225f9ed58d946f97878afc7701264eb411e
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text

  duration_ms: 0.568027
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 251 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.727146
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 252 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.301847
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 253 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.60692
  ...
# Subtest: ui/inbox: items definition, unread count and rendering
ok 254 - ui/inbox: items definition, unread count and rendering
  ---
  duration_ms: 14.209941
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 255 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.928531
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
ok 256 - ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
  ---
  duration_ms: 0.270609
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 257 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.267553
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 258 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.35192
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 259 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 2.259763
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 260 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.569259
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 261 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.688082
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 262 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 25.755229
  ...
# Subtest: ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
ok 263 - ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
  ---
  duration_ms: 15.258771
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 264 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 2.043997
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 265 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.471495
  ...
# Subtest: ui/setup: profileName and hero meta
ok 266 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.52214
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 267 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.344387
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 268 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.730091
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 269 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 26.066794
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
ok 270 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
  ---
  duration_ms: 9.148036
  ...
# Subtest: usage: what was tapped becomes a stable id
ok 271 - usage: what was tapped becomes a stable id
  ---
  duration_ms: 17.003714
  ...
# Subtest: usage: counters are per day, capped, and sent only when something changed
ok 272 - usage: counters are per day, capped, and sent only when something changed
  ---
  duration_ms: 3.523867
  ...
# Subtest: usage: the owner sees players, shares, the most used and the unused
ok 273 - usage: the owner sees players, shares, the most used and the unused
  ---
  duration_ms: 2.680183
  ...
# Subtest: usage: the database rules accept exactly what the game sends
ok 274 - usage: the database rules accept exactly what the game sends
  ---
  duration_ms: 0.930988
  ...
# Subtest: consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
ok 275 - consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
  ---
  duration_ms: 8.092364
  ...
# Subtest: consent window: a short plain reason, and the exact list of what is collected one tap away
ok 276 - consent window: a short plain reason, and the exact list of what is collected one tap away
  ---
  duration_ms: 4.63307
  ...
# Subtest: vibration has its own switch in the sound group and is on by default
ok 277 - vibration has its own switch in the sound group and is on by default
  ---
  duration_ms: 5.963227
  ...
# Subtest: every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding
ok 278 - every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding
  ---
  duration_ms: 5.164237
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 279 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.732353
  ...
1..279
# tests 279
# suites 0
# pass 255
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 4443.691829

```
## build
```text

BUILD SUCCESSFUL in 1m 35s
46 actionable tasks: 46 executed
```
