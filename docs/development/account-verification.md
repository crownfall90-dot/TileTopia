# Account verification
Source: 42767b0e036dc9cebca9431d2e425c8813a49ea0
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
nges, escapes HTML, links and platforms
  ---
  duration_ms: 44.106985
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 39.683844
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 7.149638
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 0.696527
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.257486
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.201172
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.226574
  ...
# Subtest: telegram: openTelegramChannel and claimTelegramReward granting 500 gold
ok 213 - telegram: openTelegramChannel and claimTelegramReward granting 500 gold
  ---
  duration_ms: 0.282989
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 214 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 40.482835
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 215 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.120511
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 216 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 0.991915
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 217 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.245974
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 218 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.297596
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 219 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.10613
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 220 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.225782
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 221 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 0.897432
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 222 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.114677
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 223 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.087541
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 224 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.140731
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 225 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 0.882034
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 226 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.215249
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 227 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.182199
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 228 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 10.545113
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 229 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 0.900928
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 230 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.230231
  ...
# Subtest: ui/setup: profileName and hero meta
ok 231 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.21376
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 232 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.154625
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 233 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.289086
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 234 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 7.392961
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 235 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 2.269384
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 236 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.433337
  ...
1..236
# tests 236
# suites 0
# pass 212
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 4712.688533

```
## build
```text

BUILD SUCCESSFUL in 1m 10s
46 actionable tasks: 46 executed
```
