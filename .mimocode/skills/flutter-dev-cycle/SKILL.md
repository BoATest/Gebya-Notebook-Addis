---
name: flutter-dev-cycle
description: Flutter build, install on device, test, and screenshot verification cycle. For EthioGrade project.
---

# Flutter Dev Cycle

Complete development cycle for Flutter: build APK, install on device, run tests, and capture screenshots for verification.

## When to use
- After editing Dart code in `lib/`
- When the user says "build and test", "put it on the phone", or "check on device"
- Before committing Flutter changes

## Workflow

### 1. Analyze (optional, for large changes)
```bash
flutter analyze lib/<changed-file>.dart 2>&1
```

### 2. Build debug APK
```bash
flutter build apk --debug 2>&1
```
Workdir: `D:\ethiograde_fresh`
Build time: ~60-120s depending on changes.

### 3. Install on device
```bash
adb -s RFCX31S99RY install -r "D:\ethiograde_fresh\build\app\outputs\flutter-apk\app-debug.apk" 2>&1
```
If device serial unknown: `adb devices 2>&1` first.

### 4. Run tests
```bash
flutter test test/<test-file>.dart 2>&1
```
For widget tests that may hang, add timeout:
```bash
flutter test test/widgets/<test>.dart --timeout 60s 2>&1
```
Filter output:
```bash
flutter test test/<file>.dart 2>&1 | Select-Object -Last 5
```

### 5. Capture screenshot
```bash
Start-Sleep -Seconds 3
adb -s RFCX31S99RY shell screencap -p /sdcard/screen.png
adb -s RFCX31S99RY pull /sdcard/screen.png current_screen.png
```

### 6. Wake device (if screen off)
```bash
adb shell input keyevent KEYCODE_WAKEUP
Start-Sleep -Seconds 1
adb shell input swipe 500 1500 500 500
```
Device timeout is aggressive (~15-30s). Set longer timeout for extended sessions:
```bash
adb shell settings put system screen_off_timeout 600000
```

## Key facts
- **Device serial**: `RFCX31S99RY`
- **APK path**: `D:\ethiograde_fresh\build\app\outputs\flutter-apk\app-debug.apk`
- **Project root**: `D:\ethiograde_fresh`
- **Phone PIN**: `888888`
- **flutter install** defaults to release APK — use `adb install` with explicit debug APK path instead

## Test file patterns
- Models: `test/models/` (fast, ~4 pass)
- Services: `test/services/` (large suite, ~907 pass)
- Widgets: `test/widgets/` (~57 pass, some skipped)

## Known issues
- `auto_scan_frame_analyzer` test is flaky (PathExistsException)
- `ClassProvider.loadClasses()` hangs in test environment
- `scrollUntilVisible` needed for off-screen widgets in tests
