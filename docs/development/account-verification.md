# Account verification
Source: 7c2559e0ffd6b27535aab223b744cbb2c257c0be
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
st card to the win
ok 246 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.842425
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 247 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 1.536784
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 248 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.431708
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 249 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.457776
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 250 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.187721
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 251 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.449611
  ...
# Subtest: ui/inbox: items definition, unread count and rendering
ok 252 - ui/inbox: items definition, unread count and rendering
  ---
  duration_ms: 10.230895
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 253 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.643614
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
ok 254 - ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)
  ---
  duration_ms: 0.308096
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 255 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.260146
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 256 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.365403
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 257 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 2.324227
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 258 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.509223
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 259 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.538968
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 260 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 31.600111
  ...
# Subtest: ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
ok 261 - ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml
  ---
  duration_ms: 16.996618
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 262 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 2.386042
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 263 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.584964
  ...
# Subtest: ui/setup: profileName and hero meta
ok 264 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.469287
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 265 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.403384
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 266 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.820995
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 267 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 29.895264
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
ok 268 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats
  ---
  duration_ms: 13.810689
  ...
# Subtest: usage: what was tapped becomes a stable id
ok 269 - usage: what was tapped becomes a stable id
  ---
  duration_ms: 17.308255
  ...
# Subtest: usage: counters are per day, capped, and sent only when something changed
ok 270 - usage: counters are per day, capped, and sent only when something changed
  ---
  duration_ms: 4.9672
  ...
# Subtest: usage: the owner sees players, shares, the most used and the unused
ok 271 - usage: the owner sees players, shares, the most used and the unused
  ---
  duration_ms: 1.769229
  ...
# Subtest: usage: the database rules accept exactly what the game sends
ok 272 - usage: the database rules accept exactly what the game sends
  ---
  duration_ms: 2.260658
  ...
# Subtest: consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
ok 273 - consent: statistics need a yes, errors and security events do not; the settings and sign-up carry the legal text
  ---
  duration_ms: 8.879106
  ...
# Subtest: consent window: a short plain reason, and the exact list of what is collected one tap away
ok 274 - consent window: a short plain reason, and the exact list of what is collected one tap away
  ---
  duration_ms: 5.418932
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 275 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.460652
  ...
1..275
# tests 275
# suites 0
# pass 251
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 5026.697564

```
## build
```text

BUILD SUCCESSFUL in 1m 36s
46 actionable tasks: 46 executed
```
