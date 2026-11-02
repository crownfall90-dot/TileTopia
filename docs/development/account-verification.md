# Account verification
Source: 02d4d877b48c61b1839f1d4da315fd2a7b829c3a
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
t: state/save: getLastOnline validates timestamp freshness
ok 190 - state/save: getLastOnline validates timestamp freshness
  ---
  duration_ms: 0.325034
  ...
# Subtest: state/save: saveHistoryEntry caps at 50 matches
ok 191 - state/save: saveHistoryEntry caps at 50 matches
  ---
  duration_ms: 3.42099
  ...
# Subtest: status module: clean, filter, buy, wear, earned
ok 192 - status module: clean, filter, buy, wear, earned
  ---
  duration_ms: 26.680181
  ...
# Subtest: screens: shop statuses and "my items" open without errors, buying puts the status on
ok 193 - screens: shop statuses and "my items" open without errors, buying puts the status on # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.190283
  ...
# Subtest: profile DOM: sign-out / auth action is inside profile card; rating scope buttons exist
ok 194 - profile DOM: sign-out / auth action is inside profile card; rating scope buttons exist # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 0.209189
  ...
# Subtest: section title bar sticks to the top in the app too
ok 195 - section title bar sticks to the top in the app too # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.641913
  ...
# Subtest: telegram: message lists changes, escapes HTML, links
ok 196 - telegram: message lists changes, escapes HTML, links
  ---
  duration_ms: 71.098919
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 197 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 70.860957
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 198 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.713486
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 199 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 2.187497
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 200 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.498086
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 201 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.747439
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 202 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.303414
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 203 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.612729
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 204 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 2.221139
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 205 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.302772
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 206 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.283016
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 207 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.37615
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 208 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 2.315274
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 209 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.429588
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 210 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.438896
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 211 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 28.281122
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 212 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 2.230677
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 213 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.477688
  ...
# Subtest: ui/setup: profileName and hero meta
ok 214 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.519015
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 215 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.35481
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 216 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.721261
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 217 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 17.26091
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 218 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 5.596164
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 219 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.53842
  ...
1..219
# tests 219
# suites 0
# pass 196
# fail 0
# cancelled 0
# skipped 23
# todo 0
# duration_ms 4049.147634

```
## build
```text

BUILD SUCCESSFUL in 1m 30s
46 actionable tasks: 46 executed
```
