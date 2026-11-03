# Account verification
Source: bd210db0142aa6b6610ebad2d87b3394a0940834
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
s, escapes HTML, links and platforms
  ---
  duration_ms: 83.759468
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 75.946185
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 15.725481
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 3.404033
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.434156
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.346035
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.333175
  ...
# Subtest: telegram: openTelegramChannel and claimTelegramReward granting 500 gold
ok 213 - telegram: openTelegramChannel and claimTelegramReward granting 500 gold
  ---
  duration_ms: 0.455468
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 214 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 71.742022
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 215 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.771996
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 216 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 1.548674
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 217 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.409129
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 218 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.473154
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 219 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.219576
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 220 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.402399
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 221 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.48609
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 222 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.173158
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 223 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.143533
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 224 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.238955
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 225 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.422807
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 226 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.347487
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 227 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.346054
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 228 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 17.953856
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 229 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.405821
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 230 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.341669
  ...
# Subtest: ui/setup: profileName and hero meta
ok 231 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.335679
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 232 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.241489
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 233 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.494585
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 234 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 21.491277
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 235 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 4.777957
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 236 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.081867
  ...
1..236
# tests 236
# suites 0
# pass 212
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 2871.031338

```
## build
```text

BUILD SUCCESSFUL in 1m 12s
46 actionable tasks: 46 executed
```
