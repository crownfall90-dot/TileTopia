# Account verification
Source: 59efe87bb75341a988e125df511f9c08a2d4f0e7
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
p too # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.690181
  ...
# Subtest: telegram: message lists changes, escapes HTML, links and platforms
ok 206 - telegram: message lists changes, escapes HTML, links and platforms
  ---
  duration_ms: 92.421615
  ...
# Subtest: telegram: without secrets it skips quietly and never leaks
ok 207 - telegram: without secrets it skips quietly and never leaks
  ---
  duration_ms: 80.903186
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 208 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 31.856662
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 209 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 1.678669
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 210 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.666055
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 211 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.584994
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 212 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.500847
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 213 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 80.749236
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 214 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.676115
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 215 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 2.260277
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 216 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.524301
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 217 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 2.739162
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 218 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.30981
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 219 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.52933
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 220 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 2.301434
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 221 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.27326
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 222 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.258834
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 223 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.404947
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 224 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 2.207558
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 225 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.478655
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 226 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.453458
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 227 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 29.181766
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 228 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.822538
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 229 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.397554
  ...
# Subtest: ui/setup: profileName and hero meta
ok 230 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.448439
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 231 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.299239
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 232 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.611974
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 233 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 17.24512
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 234 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 5.012363
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 235 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 2.624649
  ...
1..235
# tests 235
# suites 0
# pass 211
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 3789.808619

```
## build
```text

BUILD SUCCESSFUL in 1m 46s
46 actionable tasks: 46 executed
```
