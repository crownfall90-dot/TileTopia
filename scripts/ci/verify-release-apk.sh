#!/usr/bin/env bash
set -euo pipefail

# If key setup or Gradle selected the wrong configuration, leave the current release in place.
: "${SIGNING_CERT_SHA256:?The protected release signer is missing}"
sdk=${ANDROID_HOME:-${ANDROID_SDK_ROOT:?Android SDK is missing}}
signer=$(find "$sdk/build-tools" -type f -name apksigner | sort -V | tail -1)
test -x "$signer"
actual=$("$signer" verify --print-certs-pem "$1" | python3 scripts/ci/apk_cert.py)
if [ "$actual" != "$SIGNING_CERT_SHA256" ]; then
  echo "::error::APK signer $actual does not match protected release certificate $SIGNING_CERT_SHA256"
  exit 1
fi
echo "Verified release APK certificate SHA-256: $actual"
