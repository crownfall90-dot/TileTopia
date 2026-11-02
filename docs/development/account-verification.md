# Account verification
Source: 03fb156ce936d35568acd2e81326d160903cb8ad
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
too # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.679564
  ...
# Subtest: telegram: message lists changes, escapes HTML, links and platforms
ok 202 - telegram: message lists changes, escapes HTML, links and platforms
  ---
  duration_ms: 66.218689
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 203 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 83.261334
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 204 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 12.343546
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 205 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 1.100738
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 206 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.465616
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 207 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.422226
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 208 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.351228
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 209 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 56.906022
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 210 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.515577
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 211 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 1.504673
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 212 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.436333
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 213 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.494264
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 214 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.202207
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 215 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.370304
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 216 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.720059
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 217 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.225151
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 218 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.157933
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 219 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.233503
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 220 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.435412
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 221 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.36365
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 222 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.33869
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 223 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 15.413551
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 224 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.450376
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 225 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.351166
  ...
# Subtest: ui/setup: profileName and hero meta
ok 226 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.336656
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 227 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.242348
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 228 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.459372
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 229 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 12.341001
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 230 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 3.850886
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 231 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.752036
  ...
1..231
# tests 231
# suites 0
# pass 208
# fail 0
# cancelled 0
# skipped 23
# todo 0
# duration_ms 2757.982449

```
## build
```text

BUILD SUCCESSFUL in 1m 27s
46 actionable tasks: 46 executed
```
