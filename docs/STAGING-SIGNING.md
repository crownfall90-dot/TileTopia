# Persistent signing for Puzzlegrad Test

This document supersedes the temporary CI signing instructions in TESTING.md.
Only com.crownfall.mosaic.test is involved. Never use the production key.

## One-time setup on Windows

Use PowerShell and keytool from an installed JDK (Android Studio bundles a JDK).
Run in a private directory outside the repository:

```powershell
keytool -genkeypair -keystore puzzlegrad-test.p12 -storetype PKCS12 -alias staging -keyalg RSA -keysize 3072 -validity 10000 -dname "CN=Puzzlegrad Test"
```

Enter a strong unique password at the prompt and keep it in a password manager.
Do not put the password in shell arguments, the chat, source files or artifacts.
Back up the keystore and password securely; generating a new key is NOT recovery.

Copy the base64 representation to the clipboard:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path .\puzzlegrad-test.p12).Path)) | Set-Clipboard
```

Repository Settings -> Secrets and variables -> Actions -> New repository secret:

- STAGING_KEYSTORE_BASE64: paste the clipboard contents.
- STAGING_STORE_PASSWORD: the keystore password.

Base64 is encoding, not encryption. Treat it as the private key. Never commit it.
Clear the clipboard after pasting. Keep the private backup outside the repository.

After secrets are saved, run Test APK (offline) from setup/test-environment.
If the workflow is not available for manual dispatch because it is absent from
the default branch, a new commit on setup/test-environment triggers it.
A signing setup commit made before the secrets exist is expected to fail.
The workflow does not generate or replace a missing signing key.

## Verification and migration

Trusted branch builds require the two secrets. PR builds use a temporary debug
key and are labeled PR-temporary-key; they are compile checks, not persistent
updates. Never install them over the persistent test app. No pull_request_target
is used. Review workflow/build changes before allowing them on trusted branches.

CI verifies the APK signature and compares the signer SHA-256 certificate digest
with the certificate in the configured keystore. TEST-BUILD.txt records the
commit and public certificate details, never the private key.
Preserve the
first trusted certificate fingerprint and compare it on later builds.

The test APK already installed from an ephemeral runner normally has a different
key. Expect ONE uninstall/reinstall of Puzzlegrad Test, losing its test saves.
Never uninstall the production game. After migration, test a later trusted
build by installing it over the persistent test app and checking saved games.
Keep versionCode increasing; the existing staging workflow run number is used.
Do not rename/recreate the workflow without considering versionCode continuity.

## Local signing

Set STAGING_KEYSTORE_FILE to the absolute keystore path and
STAGING_STORE_PASSWORD to its password in your local process environment.
Set REQUIRE_STAGING_SIGNING=true to prevent fallback to a temporary debug key.
Use the existing staging build command in TESTING.md in a disposable checkout.
Do not print the environment or save secrets in shell history.

This is a staging test APK with online capabilities, not a production release.
