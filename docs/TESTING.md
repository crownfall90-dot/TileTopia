# Test environment: Staging

## Scope

Puzzlegrad Test is the staging test application with full online capabilities and feature parity with the public release.
Its application ID is com.crownfall.mosaic.test, allowing it to be installed alongside the production app (com.crownfall.mosaic) on the same device without conflicts.
It has INTERNET permission enabled, Firebase connectivity, online rooms, matchmaking, cloud sync, Google sign-in, push notifications and updater.
Production release workflows and main are not changed by this setup.

## Build and install

Pushes to setup/test-environment or dev and pull requests targeting main run
Test APK (Staging). Download the Puzzlegrad-Test artifact from a successful
Actions run or get the latest `Puzzlegrad-Staging.apk` from the pre-release,
and install it on the test phone.
GitHub Actions usage is subject to the account's existing billing/quota settings.

## What to test

- First launch and tutorial.
- Full games with bots, scoring and end-game results.
- Online matches (quick match and rooms with friend codes).
- Google sign-in and cloud profile sync.
- Shop, collections, achievements and daily/weekly quests.
- Interface, settings, sound and Android back navigation.
- Verify that the production app and its saves remain untouched alongside the test app.

## Local build

```sh
sh scripts/wrap-web.sh
./gradlew -I scripts/staging.init.gradle assembleStagingDebug
```

## Production release gate

Record the tested commit SHA from TEST-BUILD.txt and test results before
requesting a production release. This first stage does NOT enforce a
production approval gate or automatically promote the tested artifact.
Do not run Android APK or Web version until the owner approves the release.
Existing release instructions in README that describe automatic releases
on pushes to main are outdated; current production workflows are manual.

## Remaining work

A separate Firebase project/configuration and rules are required for online
testing; never reuse production Firebase for staging. Stable staging signing,
isolated deep links, production commit approval/enforcement and full build/device
verification remain follow-up work. A successful CI build is not a device test.
