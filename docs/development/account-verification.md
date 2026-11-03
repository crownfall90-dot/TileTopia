# Account verification
Source: 5dcb82269849b83c9037b738e526a2d6aea508d6
Tests exit code: 0
Staging assembleGithubRelease exit code: 0
No APK publication, FCM send, production Firebase access, main change or signing-key rotation.
## tests
```text
h quotes, separates changes and removals, filters internal dev tools and includes poll
ok 208 - telegram: formats new items with quotes, separates changes and removals, filters internal dev tools and includes poll
  ---
  duration_ms: 65.971613
  ...
# Subtest: telegram: isTelegramWebApp detects Telegram environment
ok 209 - telegram: isTelegramWebApp detects Telegram environment
  ---
  duration_ms: 11.318417
  ...
# Subtest: telegram: initTelegramWebApp expands and configures theme colors
ok 210 - telegram: initTelegramWebApp expands and configures theme colors
  ---
  duration_ms: 0.794714
  ...
# Subtest: telegram: getTelegramUser extracts user profile and start param
ok 211 - telegram: getTelegramUser extracts user profile and start param
  ---
  duration_ms: 0.339211
  ...
# Subtest: telegram: telegramHaptic triggers impact and notification feedback
ok 212 - telegram: telegramHaptic triggers impact and notification feedback
  ---
  duration_ms: 0.280024
  ...
# Subtest: telegram: shareRoomToTelegram builds share URL with room code
ok 213 - telegram: shareRoomToTelegram builds share URL with room code
  ---
  duration_ms: 0.251582
  ...
# Subtest: telegram: openTelegramChannel and claimTelegramReward granting 500 gold
ok 214 - telegram: openTelegramChannel and claimTelegramReward granting 500 gold
  ---
  duration_ms: 0.442213
  ...
# Subtest: telegram: telegram-setup-bot.py handles missing token gracefully
ok 215 - telegram: telegram-setup-bot.py handles missing token gracefully
  ---
  duration_ms: 62.418395
  ...
# Subtest: tutorial: all steps, from the first card to the win
ok 216 - tutorial: all steps, from the first card to the win # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.872396
  ...
# Subtest: ui/hud: cityD generates SVG path data for corners and edges
ok 217 - ui/hud: cityD generates SVG path data for corners and edges
  ---
  duration_ms: 1.554125
  ...
# Subtest: ui/hud: ownSvg generates data-URI for claimed features
ok 218 - ui/hud: ownSvg generates data-URI for claimed features
  ---
  duration_ms: 0.422183
  ...
# Subtest: ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
ok 219 - ui/hud: renderPlayersListHtml renders player elements with turn badges and scores
  ---
  duration_ms: 0.477916
  ...
# Subtest: ui/results: winTitle produces appropriate win title
ok 220 - ui/results: winTitle produces appropriate win title
  ---
  duration_ms: 0.187727
  ...
# Subtest: ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
ok 221 - ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores
  ---
  duration_ms: 0.403015
  ...
# Subtest: ui/menu: formatGameMenuHtml formats offline pause menu
ok 222 - ui/menu: formatGameMenuHtml formats offline pause menu
  ---
  duration_ms: 1.210588
  ...
# Subtest: ui/menu: formatGameMenuHtml formats online game menu with resign & draw
ok 223 - ui/menu: formatGameMenuHtml formats online game menu with resign & draw
  ---
  duration_ms: 0.196991
  ...
# Subtest: ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
ok 224 - ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain
  ---
  duration_ms: 0.151033
  ...
# Subtest: ui/menu: areAllOpponentsAway checks opponent drop status
ok 225 - ui/menu: areAllOpponentsAway checks opponent drop status
  ---
  duration_ms: 0.220866
  ...
# Subtest: ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
ok 226 - ui/feedback: formatFeedbackPayload formats categories, stars, and device diagnostics
  ---
  duration_ms: 1.107776
  ...
# Subtest: ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
ok 227 - ui/feedback: renderFeedbackCardHtml renders categories, star rating and hero
  ---
  duration_ms: 0.316187
  ...
# Subtest: ui/owner: devGet and devSet handle native preferences bridge and storage
ok 228 - ui/owner: devGet and devSet handle native preferences bridge and storage
  ---
  duration_ms: 0.275387
  ...
# Subtest: ui/owner: formatDevStatus formats workflow run status and dates
ok 229 - ui/owner: formatDevStatus formats workflow run status and dates
  ---
  duration_ms: 15.315601
  ...
# Subtest: ui/setup: renderModeCardsHtml renders cards with labels and icons
ok 230 - ui/setup: renderModeCardsHtml renders cards with labels and icons
  ---
  duration_ms: 1.356915
  ...
# Subtest: ui/setup: renderRuleRowsHtml filters rules and marks active options
ok 231 - ui/setup: renderRuleRowsHtml filters rules and marks active options
  ---
  duration_ms: 0.248227
  ...
# Subtest: ui/setup: profileName and hero meta
ok 232 - ui/setup: profileName and hero meta
  ---
  duration_ms: 0.265242
  ...
# Subtest: ui/setup: adjustSeatsForMode switches between local players and bots
ok 233 - ui/setup: adjustSeatsForMode switches between local players and bots
  ---
  duration_ms: 0.226064
  ...
# Subtest: ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
ok 234 - ui/setup: renderSwatchesHtml, renderSetupMeHtml and renderSetupSeatsHtml
  ---
  duration_ms: 0.3521
  ...
# Subtest: ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
ok 235 - ui/shop: renderGiftCard, renderFiguresGrid, renderFramesGrid, renderLocationsGrid
  ---
  duration_ms: 9.055615
  ...
# Subtest: ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
ok 236 - ui/progress: ringSvg, renderMasteryGrid, renderBuildingStats, renderCollectionCard
  ---
  duration_ms: 3.023405
  ...
# Subtest: water edges: every water side has the river mouth, every pair lines up in all turns
ok 237 - water edges: every water side has the river mouth, every pair lines up in all turns # SKIP playwright is not installed (npm ci)
  ---
  duration_ms: 1.779078
  ...
1..237
# tests 237
# suites 0
# pass 213
# fail 0
# cancelled 0
# skipped 24
# todo 0
# duration_ms 2864.463132

```
## build
```text

BUILD SUCCESSFUL in 1m 22s
46 actionable tasks: 46 executed
```
