# Account verification
Source: f40cd17daf05e1a8b0aec3dd480a39852dee4ce0
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
p too # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.43281
  ...
# Subtest: telegram: message lists changes, escapes HTML, links and platforms
ok 206 - telegram: message lists changes, escapes HTML, links and platforms
  ---
  duration_ms: 57.812946
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 49.863958
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 12.27714
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 0.879856
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.386733
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.306882
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.275675
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 213 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 50.032442
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 214 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.365618
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 215 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 0.822119
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 216 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.268815
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 217 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.316057
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 218 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.095293
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 219 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.193021
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 220 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 0.957994
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 221 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.131468
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 222 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.094873
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 223 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.161904
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 224 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.03474
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 225 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.250167
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 226 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.197948
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 227 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 13.374013
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 228 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.107399
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 229 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.273162
  ...
# Subtest: ui/setup: profileName and hero meta
ok 230 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.251689
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 231 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.181383
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 232 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.356367
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 233 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 8.678707
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 234 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 2.863695
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 235 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.438888
  ...
1..235
# tests 235
# suites 0
# pass 211
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 2264.771358

```
## build
```text

BUILD SUCCESSFUL in 1m 19s
46 actionable tasks: 46 executed
```
