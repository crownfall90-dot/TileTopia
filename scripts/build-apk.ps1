# Windows: builds the test APK and installs it on the running Android Studio emulator (or a phone with USB debugging).
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
# Needs Android Studio (it brings the SDK, JDK and the emulator) and Node.js.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path 'local.properties')) { "sdk.dir=$($sdk -replace '\\','\\')" | Out-File -Encoding ascii local.properties }
if (-not $env:JAVA_HOME -and (Test-Path 'C:\Program Files\Android\Android Studio\jbr')) { $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr' }
npm run build
sh scripts/wrap-web.sh 2>$null; if ($LASTEXITCODE -ne 0) { & 'C:\Program Files\Git\bin\sh.exe' scripts/wrap-web.sh }
.\gradlew.bat assembleStagingDebug
& (Join-Path $sdk 'platform-tools\adb.exe') install -r app\build\outputs\apk\staging\debug\app-staging-debug.apk
Write-Host 'Готово: игра установлена на эмулятор. Откройте «Tiletopia Test».'
