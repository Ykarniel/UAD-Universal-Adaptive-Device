# UAD Mobile App - Installation & Build Guide

## 📱 What You're Building

An intuitive mobile app that:
- ✅ Connects to UAD via **Bluetooth**
- ✅ Displays real-time telemetry and adaptive dashboard
- ✅ **Controls** the device (calibrate, switch modes, etc.)
- ✅ **Recodes** the device via AI (the magic feature!)
- ✅ Uses phone's internet for cloud AI features
- ✅ Works on **Android & iOS**

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** 16+ installed
2. **Android Studio** (for Android) or **Xcode** (for iOS/macOS only)
3. Physical Android/iOS device (BLE doesn't work in emulators well)

### Installation

```bash
cd c:/Dev/UAD/dashboard

# Install Capacitor and BLE plugin
npm install @capacitor/core @capacitor/cli
npm install @capacitor-community/bluetooth-le

# Initialize Capacitor (already done - skip if capacitor.config.json exists)
npx cap init

# Add platforms
npx cap add android
npx cap add ios  # macOS only

# Build web assets
npm run build

# Sync to native projects
npx cap sync
```

---

## 🤖 Android Build

### 1. Open Android Studio

```bash
npx cap open android
```

This opens the project in Android Studio.

### 2. Configure App

In Android Studio:
- Go to `File > Project Structure`
- Set **Minimum SDK**: API 22 (Android 5.1)
- Set **Target SDK**: API 33 (Android 13)

### 3. Add BLE Permissions

File: `android/app/src/main/AndroidManifest.xml`

Add these permissions BEFORE `<application>`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### 4. Build & Run

1. Connect your Android phone via USB
2. Enable **Developer Mode** + **USB Debugging** on phone
3. In Android Studio, click ▶️ **Run**
4. App installs and launches on your phone!

---

## 🍎 iOS Build (macOS Only)

### 1. Open Xcode

```bash
npx cap open ios
```

### 2. Configure Signing

- In Xcode, select project root
- Go to **Signing & Capabilities**
- Select your **Team** (Apple Developer account required)
- Xcode will auto-fix provisioning

### 3. Add BLE Permissions

File: `ios/App/App/Info.plist`

Add these keys:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>UAD needs Bluetooth to connect to your device</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>UAD connects to Bluetooth devices</string>
```

### 4. Build & Run

1. Connect your iPhone via USB
2. Select your device in Xcode
3. Click ▶️ **Run**
4. App installs on iPhone!

---

## 🎮 Using the App

### First Launch

1. **Open app** on your phone
2. Tap **"🎮 Control"** tab at top
3. Tap **"📡 Connect to UAD"**
4. Phone scans for nearby UAD devices
5. Select your device from list
6. ✅ **Connected!**

### Dashboard Tab

Shows adaptive UI based on current mode:
- **Helmet Mode** (Orange): Impact gauge, fall log, SOS button
- **Bicycle Mode** (Blue): Speed gauge, route, calories
- **Asset Mode** (Green): Location, motion log
- **Discovery Mode** (Purple): AI analysis animation

### Control Tab

#### 📱 Device Connection
- Connect/disconnect from UAD
- Shows current mode and battery

#### ⚡ Quick Actions
- **🤖 AI Analysis**: Triggers cloud analysis of current sensor pattern
- **🎯 Calibrate**: Recalibrates IMU (keep still for 10s)

#### 🔄 Switch Mode
Quick buttons to force context switching:
- 🦺 Helmet
- 🚴 Bicycle
- 📦 Asset
- 🚗 Vehicle

#### ✨ **Self-Recoding (The Magic!)**

This is the killer feature! 🚀

1. Enter custom device type (e.g., "guitar", "dumbbell", "dog")
2. Tap **"🤖 Recode Device"**
3. App confirms the AI workflow
4. Behind the scenes:
   - Device sends request to your phone via BLE
   - Phone uses internet to call backend API
   - Gemini AI generates C++ module code
   - Backend compiles firmware
   - Phone downloads compiled binary
   - Phone sends to device via BLE
   - Device reboots with new functionality!

**Example:**
```
Type: "guitar"
↓
Wait 1-2 minutes...
↓
Device becomes a guitar tuner with:
- Chord detection
- Tuning accuracy gauge
- Practice timer
- Custom dashboard theme (amber/orange)
```

---

## 🔧 Development

### Live Reload (Browser Testing)

```bash
npm run dev
# Open http://localhost:5173
```

Works in browser with simulated data (BLE only works on real device).

### Update After Code Changes

```bash
# Build web assets
npm run build

# Sync to native
npx cap sync

# Reopen in Android Studio/Xcode
npx cap open android  # or ios
```

Then re-run from Android Studio/Xcode.

### Debug Logs

- **Android**: Use Android Studio's Logcat
- **iOS**: Use Xcode's Console
- Enable `console.log` in `BLEService.js` to see BLE communication

---

## 📡 BLE Communication Flow

```
Phone App                    UAD Device
    |                            |
    | ─── Scan for "UAD" ───────→|
    |                            |
    |←── Found: "UAD-Device" ────|
    |                            |
    | ─── Connect ──────────────→|
    |                            |
    |←── Telemetry (JSON) ───────| Every 2s
    | {"context":1,"value":350...|
    |                            |
    | ─── Command "recode" ─────→|
    |                            |
    |←── Status updates ─────────|
```

**Telemetry** (Device → Phone):
- Sent every 2 seconds
- JSON format: `{context, status, value, battery}`

**Commands** (Phone → Device):
- ai_analysis, force_context, ota_update, calibrate, configure

---

## 🚨 Troubleshooting

### "BLE not available"
- Check you're running on physical device, not emulator
- Android: Enable Location services (required for BLE scan)
- iOS: Grant Bluetooth permission when prompted

### "Device not found"
- Make sure UAD firmware is running and advertising
- Check device name starts with "UAD"
- Try resetting device

### "Connection failed"
- Device might already be connected to another phone
- Reset device and try again
- Check distance (BLE works up to ~100m, but weaker through walls)

### App crashes on launch
- Check Android/iOS permissions in manifest
- View logs in Android Studio/Xcode
- Rebuild: `npm run build && npx cap sync`

### Changes not showing
- Always run `npm run build` after code changes
- Then `npx cap sync`
- Then re-run from Android Studio/Xcode

---

## 📦 Distribution

### Android APK

```bash
# In Android Studio:
Build > Build Bundle(s) / APK(s) > Build APK(s)

# Find APK at:
android/app/build/outputs/apk/debug/app-debug.apk
```

Share this APK file with others!

### iOS App Store

Requires Apple Developer account ($99/year):
1. Archive app in Xcode
2. Upload to App Store Connect
3. Submit for review

---

## 🎯 Next Features to Add

- [ ] Multiple device management (connect to 5+ UADs)
- [ ] LoRa mesh network visualization
- [ ] Emergency broadcast system
- [ ] Data export (CSV/JSON)
- [ ] Custom widget marketplace
- [ ] Voice commands ("Hey UAD, switch to helmet mode")
- [ ] Wear OS / Apple Watch companion app

---

## 💡 Tips

1. **Keep phone nearby**: BLE range ~10-100m depending on obstacles
2. **Battery optimization**: App uses minimal power (BLE vs WiFi = 70% savings)
3. **Offline mode**: Dashboard works offline, but AI features need internet
4. **Custom modules**: Try recoding as "plant", "door", "drill", etc.!

---

## 🆘 Support

If stuck, check:
- [Capacitor Docs](https://capacitorjs.com/docs)
- [BLE Plugin Docs](https://github.com/capacitor-community/bluetooth-le)
- Backend logs at `c:/Dev/UAD/backend/`

**Happy building! 🚀**
