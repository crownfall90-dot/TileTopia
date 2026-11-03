# Account verification
Source: fd8eec98404945a2b64d181a948ea4011c6b6ed9
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
hanges, escapes HTML, links and platforms
  ---
  duration_ms: 42.124714
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 40.149879
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 7.050357
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 0.663513
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.238343
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.195727
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.19397
  ...
# Subtest: telegram: openTelegramChannel and claimTelegramReward granting 500 gold
ok 213 - telegram: openTelegramChannel and claimTelegramReward granting 500 gold
  ---
  duration_ms: 0.346269
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 214 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 41.812365
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 215 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.14519
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 216 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 0.916992
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 217 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.238562
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 218 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.292362
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 219 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.108602
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 220 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.216025
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 221 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 0.957414
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 222 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.118188
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 223 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.080772
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 224 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.167769
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 225 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 0.853979
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 226 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.201512
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 227 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.214133
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 228 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 11.397196
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 229 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.29488
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 230 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.346545
  ...
# Subtest: ui/setup: profileName and hero meta
ok 231 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.346626
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 232 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.249218
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 233 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.47564
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 234 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 8.742048
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 235 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 3.209024
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 236 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.060084
  ...
1..236
# tests 236
# suites 0
# pass 212
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 3329.704404

```
## build
```text

BUILD SUCCESSFUL in 1m 26s
46 actionable tasks: 46 executed
```
