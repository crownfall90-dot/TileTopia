# Account verification
Source: dd8b0e959a37e85887bb9cf3359ca77c39128bbe
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
ges, escapes HTML, links and platforms
  ---
  duration_ms: 49.467856
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 53.887448
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 8.384774
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 0.79699
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.316373
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.257955
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.319097
  ...
# Subtest: telegram: openTelegramChannel and claimTelegramReward granting 500 gold
ok 213 - telegram: openTelegramChannel and claimTelegramReward granting 500 gold
  ---
  duration_ms: 0.475801
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 214 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 53.043273
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 215 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.295666
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 216 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 1.090428
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 217 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.278486
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 218 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.364755
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 219 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.137876
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 220 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.282192
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 221 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 0.992723
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 222 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.142693
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 223 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.110315
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 224 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.170044
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 225 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.601391
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 226 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.383072
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 227 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.380118
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 228 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 12.589374
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 229 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.02422
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 230 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.267459
  ...
# Subtest: ui/setup: profileName and hero meta
ok 231 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.253769
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 232 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.183464
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 233 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.488279
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 234 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 21.081843
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 235 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 9.038501
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 236 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.995811
  ...
1..236
# tests 236
# suites 0
# pass 212
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 3443.290553

```
## build
```text

BUILD SUCCESSFUL in 1m 29s
46 actionable tasks: 46 executed
```
