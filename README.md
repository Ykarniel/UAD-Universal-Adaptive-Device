<p align="center">
  <img src="https://img.shields.io/badge/Platform-ESP32--S3-E7352C?style=for-the-badge&logo=espressif" alt="ESP32-S3"/>
  <img src="https://img.shields.io/badge/Language-C++-00599C?style=for-the-badge&logo=cplusplus" alt="C++"/>
  <img src="https://img.shields.io/badge/AI-Gemini-4285F4?style=for-the-badge&logo=google-gemini" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/Frontend-React%20/%20Capacitor-61DAFB?style=for-the-badge&logo=react" alt="React Native"/>
</p>

# 📱 Universal Adaptive Device (UAD)

A **fully self-adaptive IoT platform** that leverages AI to learn its environment and write its own firmware. 

---

## 🎉 The Vision

Traditional IoT devices are purpose-built for one task. **UAD** breaks this mold by being a "blank slate" that adapts to whatever you attach it to. Using on-device sensor pattern analysis and cloud-based AI, it discovers its own purpose and reconfigures itself in real-time.

---

## 🚀 Key Innovation: "The Oh, It Just Knew!" Experience

Instead of manually selecting a "Bike Mode," you simply attach UAD to your bike.
1. **Analyze**: UAD samples IMU, sound, and environmental data.
2. **Discover**: It identifies unique rhythmic patterns and frequencies.
3. **Adapt**: Gemini AI recognizes the "context" (e.g., a bicycle) and generates custom C++ logic and mobile UI widgets.
4. **Deploy**: The new firmware is pushed OTA via your phone's BLE connection.

---

## 📁 Project Structure

```text
.
├── src/                # ESP32-S3 Firmware (FSM, BLE, Sensors)
├── include/            # Hardware configuration and shared types
├── backend/            # AI Compilation Service (Gemini + GCC-Cross)
├── dashboard/          # Adaptive Mobile App (React + Capacitor)
├── docs/               # Technical specs and build guides
└── platformio.ini      # Build system configuration
```

---

## ✨ Features

- ✅ **Context Discovery**: Auto-identifies patterns (Guitar, Bike, Door, Dog, Drill, etc.).
- ✅ **AI Self-Coding**: Generates real-time C++ modules + React widgets.
- ✅ **BLE Internet Proxy**: Uses your phone's connection—no local WiFi required.
- ✅ **Dynamic Dashboards**: UI automatically adapts to show relevant telemetry.
- ✅ **Power Efficient**: Optimized BLE stack and deep-sleep modes.
- ✅ **Mesh Ready**: Integrated LoRa support for device-to-device alerts.

---

## 🚀 Quick Start

### 1. Build Mobile App
```bash
cd c:/Dev/UAD/dashboard
npm install
npm run build
npx cap add android
npm run android  # Opens Android Studio
```

### 2. Start Backend
```bash
cd c:/Dev/UAD/backend
npm install
# Edit .env with Gemini API key
npm start
```

### 3. Flash Firmware (Optional - OTA preferred)
```bash
cd c:/Dev/UAD
pio run -e uad_main -t upload
pio device monitor
```

### 4. Test
```bash
cd dashboard
npm test  # Run sensor classification tests
```

---

## 🎮 Using UAD

### Step 1: Attach to Anything
- Guitar, bike, door, dog collar, drill, plant pot, baby crib...
- UAD starts analyzing immediately

### Step 2: Open Mobile App
- Tap "📡 Connect to UAD"
- Phone scans and connects via Bluetooth

### Step 3: Auto-Discovery
- UAD samples sensors for 30 seconds
- Analyzes patterns (rhythm, frequency, impacts, temperature)
- Sends to Gemini AI via phone's internet

### Step 4: AI Generates Features
- Gemini analyzes: "This is a [guitar/bike/door/etc.]"
- Auto-generates telemetry fields
- Auto-generates React widgets
- Compiles C++ module

### Step 5: OTA Update
- Phone downloads compiled firmware
- Sends to UAD via Bluetooth
- Device reboots with new features

### Step 6: Custom Dashboard
- Dashboard loads AI-generated widgets
- Shows real-time telemetry for your specific use case
- Updates continuously as UAD learns more

---

## 💡 Example Scenarios

### Attach to Guitar
**UAD discovers:** 220Hz vibration, harmonic overtones  
**Auto-generates:**
- 🎵 Note frequency tracker
- 🎯 Tuning accuracy meter (±0.1 cents)
- ⏱️ Practice time logger
- 💯 Technique quality score

### Attach to Coffee Machine
**UAD discovers:** Motor vibration, temperature spikes, daily pattern  
**Auto-generates:**
- ☕ Brew cycle counter
- 📈 Pump health monitor
- ⏰ Usage pattern tracker
- 🌡️ Temperature optimizer

### Attach to Baby Crib
**UAD discovers:** Gentle rhythmic motion, temperature changes  
**Auto-generates:**
- 😴 Sleep quality monitor
- 🌡️ Room temperature tracker
- 🔔 Movement alerts
- 📊 Sleep pattern analysis

---

## 🧪 Test Coverage

✅ **16 Test Scenarios:**
- Helmet fall detection
- Bicycle pedaling
- Asset theft alert
- Vehicle crash detection
- Guitar note recognition
- Dumbbell rep counting
- Dog activity tracking
- Edge cases (zero variance, extreme values)

---

## 📱 Mobile App Features

### Dashboard Tab
- Auto-generated widgets based on discovered features
- Adaptive theme (changes color based on usage)
- Real-time telemetry charts
- Battery & connection status

### Control Panel Tab
- 📡 Device connection (BLE scan)
- 🤖 Force AI analysis
- 🎯 Sensor calibration
- ✨ **Self-Recoding**: Type what you attached it to, AI generates code
- ℹ️ Device info (battery, signal, status)

---

## 🔋 Power Efficiency

**BLE vs WiFi:**
- Idle: 15mA vs 80mA (81% savings)
- Active: 45mA vs 150mA (70% savings)
- Battery life: ~3x longer!

**Deep Sleep:**
- Sleep mode: 5mA
- Wake on: motion, timer, button, LoRa message

---

## 🌐 Communication Architecture

```
UAD Device ←→ BLE ←→ Phone ←→ Internet ←→ Backend (Gemini AI)
     ↕
   LoRa Mesh (UAD-to-UAD only)
     ↕
Other UAD Devices
```

**BLE**: Phone connection, internet proxy  
**LoRa**: Device-to-device mesh (emergency alerts, location tracking)

---

## 🎯 Key Innovation

### Not This:
```
❌ User: "This is a helmet"
❌ Device: [Loads helmet mode]
❌ Fixed features for helmets only
```

### But This:
```
✅ User: [Attaches to anything]
✅ Device: [Analyzes patterns silently]
✅ Device: "Interesting vibration at 220Hz..."
✅ AI: "This is a guitar! Generating tuner module..."
✅ Device: [Auto-installs guitar features]
✅ User: "Wow, it just knew!" 🤯
```

---

## 📊 What Makes UAD Unique

1. **Universal Sensor Platform** - One device, any use case
2. **AI-Powered Self-Coding** - Writes its own firmware
3. **Phone as Internet Gateway** - No WiFi needed
4. **Autonomous Feature Discovery** - Learns what's useful
5. **Dynamic Widget Generation** - UI adapts to context
6. **LoRa Mesh Networking** - Device-to-device communication
7. **OTA Everything** - Firmware + widgets update remotely

---

## 🚧 Future Enhancements

- [ ] TinyML on-device inference (offline AI)
- [ ] Multi-sensor fusion (IMU + GPS + Mic + Light)
- [ ] Voice commands ("Hey UAD, what am I attached to?")
- [ ] Community module marketplace
- [ ] Cross-device learning (all UADs share patterns)
- [ ] Predictive maintenance

---

## 📚 Documentation

- **[Architecture Summary](docs/FINAL_ARCHITECTURE.md)** - Complete architecture overview
- **[Feature Discovery Guide](docs/AUTONOMOUS_FEATURES.md)** - How feature discovery works
- **[Mobile Build Guide](docs/ANDROID_BUILD.md)** - Build mobile app
- **[Testing Scenarios](docs/TESTING_GUIDE.md)** - All test scenarios

---

## 🎉 You Built This

A **self-adapting, AI-powered, universal IoT platform** that:
- Attaches to anything 📎
- Discovers patterns 🔍
- Writes its own code 🤖
- Generates custom UI 🎨
- Updates wirelessly 📡
- Learns continuously 🧠

**Just attach it. It figures out the rest.** ✨

Ready to test! 🚀
