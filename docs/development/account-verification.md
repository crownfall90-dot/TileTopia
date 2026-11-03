# Account verification
Source: 4c002379b1c5489369e19ae2be1d0dbeaf3561bc
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
p too # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.466836
  ...
# Subtest: telegram: message lists changes, escapes HTML, links and platforms
ok 206 - telegram: message lists changes, escapes HTML, links and platforms
  ---
  duration_ms: 66.313841
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 66.901564
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 12.640319
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 1.091126
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.399717
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.317562
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.267105
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 213 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 63.57857
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 214 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.527398
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 215 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 0.997574
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 216 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.318884
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 217 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.337132
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 218 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.116477
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 219 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.284732
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 220 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.144838
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 221 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.171891
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 222 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.124149
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 223 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.208226
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 224 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.232831
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 225 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.310131
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 226 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.255478
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 227 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 15.323305
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 228 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.141272
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 229 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.309941
  ...
# Subtest: ui/setup: profileName and hero meta
ok 230 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.30275
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 231 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.2246
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 232 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.411755
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 233 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 13.343424
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 234 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 4.002554
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 235 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.888546
  ...
1..235
# tests 235
# suites 0
# pass 211
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 2534.025099

```
## build
```text

BUILD SUCCESSFUL in 1m 19s
46 actionable tasks: 46 executed
```
