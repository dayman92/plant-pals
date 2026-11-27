# Builds a signed release APK (for sideloading) and App Bundle (for Google Play) into dist/.  Usage:  npm run apk
# Needs: Node, JDK 21, the Android SDK, and android/keystore.properties (local only, see README).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $env:JAVA_HOME) {
  $jdk = Get-ChildItem 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { $env:PATH = 'C:\Program Files\nodejs;' + $env:PATH }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path (Join-Path $root 'android\keystore.properties'))) { throw 'android/keystore.properties is missing, so the APK cannot be signed. See README.' }

Set-Location $root
npx cap sync android
if ($LASTEXITCODE) { throw 'cap sync failed' }
Set-Location (Join-Path $root 'android')
.\gradlew.bat assembleRelease bundleRelease
if ($LASTEXITCODE) { throw 'Gradle build failed' }

$version = (Select-String -Path 'app\build.gradle' -Pattern 'versionName "(.+)"').Matches[0].Groups[1].Value
New-Item -ItemType Directory -Force (Join-Path $root 'dist') | Out-Null
$out = Join-Path $root "dist\PlantPals-$version.apk"
Copy-Item 'app\build\outputs\apk\release\app-release.apk' $out -Force
$aab = Join-Path $root "dist\PlantPals-$version.aab"
Copy-Item 'app\build\outputs\bundle\release\app-release.aab' $aab -Force
Write-Host "Built $out"
Write-Host "Built $aab"
