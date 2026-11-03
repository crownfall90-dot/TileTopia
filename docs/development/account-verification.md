# Account verification
Source: 20cbb8b369a73db26234ea5cc3b7d2e2e333005b
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
anges, escapes HTML, links and platforms
  ---
  duration_ms: 51.240081
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 45.079615
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 11.458453
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 0.793886
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.331059
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.3918
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.332941
  ...
# Subtest: telegram: openTelegramChannel and claimTelegramReward granting 500 gold
ok 213 - telegram: openTelegramChannel and claimTelegramReward granting 500 gold
  ---
  duration_ms: 0.428886
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 214 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 59.246457
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 215 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.3742
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 216 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 1.133136
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 217 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.312991
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 218 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.350357
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 219 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.141163
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 220 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.310928
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 221 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.026706
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 222 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.156746
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 223 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.114482
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 224 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.182105
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 225 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.450204
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 226 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.394364
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 227 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.326592
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 228 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 17.728153
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 229 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.004783
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 230 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.263136
  ...
# Subtest: ui/setup: profileName and hero meta
ok 231 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.253381
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 232 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.180412
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 233 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.387914
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 234 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 8.688933
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 235 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 2.565803
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 236 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.304444
  ...
1..236
# tests 236
# suites 0
# pass 212
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 3881.512512

```
## build
```text

BUILD SUCCESSFUL in 1m 41s
46 actionable tasks: 46 executed
```
