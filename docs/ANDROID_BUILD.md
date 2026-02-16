# Native Android App Setup

## Quick Build Commands

```bash
cd c:/Dev/UAD/dashboard

# 1. Install dependencies
npm install

# 2. Build web assets
npm run build

# 3. Initialize Capacitor (if not done)
npx cap add android

# 4. Sync and open Android Studio
npm run android
```

## What Happens

1. **Vite builds** your React app → `dist/` folder
2. **Capacitor syncs** web assets to Android project
3. **Android Studio opens** with native project
4. You can now build APK or run on device!

## Android Project Structure

```
dashboard/
├── android/                    # ← Native Android project
│   └── app/
│       └── src/
│           └── main/
│               ├── AndroidManifest.xml
│               ├── java/
│               └── res/
├── dist/                       # ← Built web app
└── src/                        # ← React source
```

## First Time Setup

### 1. Add BLE Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- BLE Permissions -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN"
                     android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <!-- Internet for AI features -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### 2. Configure App Icon

Replace default icon in `android/app/src/main/res/`:
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

### 3. Update App Name

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">UAD Control</string>
    <string name="title_activity_main">UAD</string>
</resources>
```

## Build & Run

### Run on Physical Device

1. Enable **Developer Options** on Android phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging"

2. Connect phone via USB

3. In Android Studio:
   - Select your device from dropdown
   - Click ▶️ Run
   - App installs and launches!

### Build APK

In Android Studio:
```
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

APK location:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Share this file to install on other Android devices!

### Build Release APK (Signed)

1. Generate signing key:
```bash
keytool -genkey -v -keystore uad-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias uad
```

2. Configure in `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('../../uad-release-key.jks')
            storePassword 'your_password'
            keyAlias 'uad'
            keyPassword 'your_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. Build release:
```
Build > Generate Signed Bundle / APK > APK
```

## Development Workflow

### After Code Changes

```bash
# 1. Rebuild web assets
npm run build

# 2. Sync to Android
npx cap sync

# 3. Refresh in Android Studio
# Then click ▶️ Run again
```

### Live Reload (Browser Testing)

```bash
# Test in browser first
npm run dev
# Open http://localhost:5173

# BLE won't work, but UI/logic can be tested
```

### Debug Logs

In Android Studio:
- View > Tool Windows > Logcat
- Filter by "UAD" or "BLE" or "Capacitor"

## Common Issues

### "BLE not available"
- Make sure running on **physical device** (not emulator)
- Check permissions in AndroidManifest.xml
- Grant location permission when app asks

### "Device not found"
- UAD firmware must be running
- Device must be advertising as "UAD-Device"
- Try resetting UAD device

### Changes not showing
- Always run `npm run build` first
- Then `npx cap sync`
- Then re-run in Android Studio

### Build errors
```bash
# Clean and rebuild
cd android
./gradlew clean
```

## App Size

- **Debug APK**: ~15-20 MB
- **Release APK**: ~8-12 MB (after minification)

## Next Steps

1. ✅ Build debug APK
2. ✅ Test on your phone
3. ✅ Try BLE connection to UAD device
4. ✅ Test "Recode Device" feature
5. ⏳ Publish to Google Play Store (requires developer account)
