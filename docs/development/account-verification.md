# Account verification
Source: aa0da9171ef69ef4d7ec22b55b7ad2e8936a723d
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
ate/save: getLastOnline validates timestamp freshness
ok 196 - state/save: getLastOnline validates timestamp freshness
  ---
  duration_ms: 0.365621
  ...
# Subtest: state/save: saveHistoryEntry caps at 50 matches
ok 197 - state/save: saveHistoryEntry caps at 50 matches
  ---
  duration_ms: 3.82459
  ...
# Subtest: status module: clean, filter, buy, wear, earned
ok 198 - status module: clean, filter, buy, wear, earned
  ---
  duration_ms: 20.933951
  ...
# Subtest: screens: shop statuses and "my items" open without errors, buying puts the status on
ok 199 - screens: shop statuses and "my items" open without errors, buying puts the status on # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 0.987008
  ...
# Subtest: profile DOM: sign-out / auth action is inside profile card; rating scope buttons exist
ok 200 - profile DOM: sign-out / auth action is inside profile card; rating scope buttons exist # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 0.236671
  ...
# Subtest: section title bar sticks to the top in the app too
ok 201 - section title bar sticks to the top in the app too # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.780595
  ...
# Subtest: telegram: message lists changes, escapes HTML, links
ok 202 - telegram: message lists changes, escapes HTML, links
  ---
  duration_ms: 103.136369
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 203 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 83.505853
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 204 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.638812
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 205 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 2.102464
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 206 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.513266
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 207 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.629652
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 208 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.234888
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 209 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.512294
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 210 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 5.214207
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 211 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.343399
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 212 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.26849
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 213 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 1.369349
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 214 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.951453
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 215 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.437735
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 216 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.385888
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 217 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 24.041836
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 218 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.897041
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 219 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.414652
  ...
# Subtest: ui/setup: profileName and hero meta
ok 220 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.469134
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 221 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.304086
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 222 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.653707
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 223 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 24.371276
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 224 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 10.380188
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 225 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.663158
  ...
1..225
# tests 225
# suites 0
# pass 202
# fail 0
# cancelled 0
# skipped 23
# todo 0
# duration_ms 4199.120258

```
## build
```text

BUILD SUCCESSFUL in 1m 28s
46 actionable tasks: 46 executed
```
