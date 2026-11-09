#!/bin/sh
# Builds the test APK (staging, debug) on Linux, installing the Android SDK the first time.
#   sh scripts/build-apk.sh            -> build/apk/Tiletopia-test.apk
#   sh scripts/build-apk.sh install    -> also installs it on the phone or emulator adb sees
set -e
cd "$(dirname "$0")/.."
SDK="${ANDROID_HOME:-/opt/android-sdk}"
if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK/cmdline-tools"
  curl -sSL -o /tmp/clt.zip https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
  unzip -q -o /tmp/clt.zip -d "$SDK/cmdline-tools" && rm -rf "$SDK/cmdline-tools/latest" && mv "$SDK/cmdline-tools/cmdline-tools" "$SDK/cmdline-tools/latest"
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
  "$SDK/cmdline-tools/latest/bin/sdkmanager" "platforms;android-36" "build-tools;36.0.0" "platform-tools" >/dev/null
fi
[ -f local.properties ] || echo "sdk.dir=$SDK" > local.properties
npm run build >/dev/null && sh scripts/wrap-web.sh >/dev/null
ANDROID_HOME="$SDK" ./gradlew assembleStagingDebug --no-daemon -q
mkdir -p build/apk && cp app/build/outputs/apk/staging/debug/app-staging-debug.apk build/apk/Tiletopia-test.apk
echo "build/apk/Tiletopia-test.apk"
if [ "$1" = install ]; then "$SDK/platform-tools/adb" install -r build/apk/Tiletopia-test.apk; fi
