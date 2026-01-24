# PowerShell script to run Android build with proper Java options
# This script sets the necessary JAVA_TOOL_OPTIONS to work around CMake restrictions
# with Java 24 and runs the Expo Android build

Write-Host "Setting JAVA_TOOL_OPTIONS for Android build..." -ForegroundColor Green
$env:JAVA_TOOL_OPTIONS = '-XX:+IgnoreUnrecognizedVMOptions --add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.io=ALL-UNNAMED --add-opens=java.base/java.util=ALL-UNNAMED'

Write-Host "Starting Android build..." -ForegroundColor Green
npx expo run:android
