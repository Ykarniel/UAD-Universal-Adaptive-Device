<p align="center">
  <img src="https://img.shields.io/badge/Platform-ESP32--S3-E7352C?style=for-the-badge&logo=espressif" alt="ESP32-S3"/>
  <img src="https://img.shields.io/badge/Language-C++-00599C?style=for-the-badge&logo=cplusplus" alt="C++"/>
  <img src="https://img.shields.io/badge/AI-Gemini-4285F4?style=for-the-badge&logo=google-gemini" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/Frontend-React%20/%20Capacitor-61DAFB?style=for-the-badge&logo=react" alt="React Native"/>
</p>

# 📱 Universal Adaptive Device (UAD)

A **universal hardware platform** that redefines itself through an AI-powered "Hardware App Store." 

---

## 🎉 The Vision

Traditional IoT devices are fixed in their purpose. **UAD** is the "Smartphone of IoT"—a single, high-performance hardware unit that can transform into any device you need. Whether you need a high-precision guitar tuner today or a bike security system tomorrow, UAD reconfigures its entire firmware and user interface to match your choice.

---

## 🚀 Key Innovation: The Hardware App Store

UAD moves away from static, hard-coded devices. Through the mobile companion app, users browse a library of "Hardware Apps":
1. **Choose**: Select an application from the UAD Store (e.g., Guitar, Bicycle, Smart Door).
2. **AI-Synthesis**: Gemini AI analyzes the chosen context and generates optimized C++ firmware modules and React dashboard widgets.
3. **Deploy**: The custom-built firmware is pushed instantly over-the-air (OTA) via Bluetooth Low Energy (BLE).
4. **Transform**: The device reboots, and your universal hardware is now a specialized tool with a custom UI.

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

- ✅ **On-Demand Transformation**: Instantly switch device purpose via software.
- ✅ **AI Self-Coding**: Backend automatically writes and compiles C++ modules + React widgets based on your needs.
- ✅ **BLE Internet Proxy**: Uses your phone's connection—no local WiFi required for cloud updates.
- ✅ **Dynamic Dashboards**: Mobile UI automatically adapts to show the relevant telemetry for your selected app.
- ✅ **Power Efficient**: Optimized BLE stack and deep-sleep modes for long-term battery use.
- ✅ **Mesh Ready**: Integrated LoRa support for device-to-device alerts (e.g., security or location tracking).

---

## 🚀 Quick Start

### 1. Build Mobile App
```bash
cd dashboard
npm install
npm run build
npx cap add android
npm run android  # Opens Android Studio
```

### 2. Start Backend
```bash
cd backend
npm install
# Edit .env with Gemini API key
npm start
```

### 3. Flash Firmware (Initial setup)
```bash
pio run -e uad_main -t upload
pio device monitor
```

---

## 🎮 Using UAD

### Step 1: Browse the Store
- Open the UAD companion app and pick the mode you need: Guitar, Bike, Door, Dog, Drill, etc.

### Step 2: Connect
- Tap "📡 Connect to UAD" to pair with your hardware via Bluetooth.

### Step 3: AI Generation
- The backend uses Gemini to generate the specific logic for your selected mode.

### Step 4: OTA Update
- Your phone downloads the newly synthesized firmware and sends it to the UAD device.

### Step 5: Specialized Hardware
- The device reboots and the dashboard loads your custom widgets. You now have a specialized device tailored to your specific task!

---

## 💡 Example Scenarios

### Pick "Guitar Mode"
**UAD transforms into a high-precision musical tool:**
- 🎵 Note frequency tracker
- 🎯 Tuning accuracy meter (±0.1 cents)
- ⏱️ Practice time logger
- 💯 Technique quality score

### Pick "Coffee Machine Mode"
**UAD transforms into a machine health monitor:**
- ☕ Brew cycle counter
- 📈 Pump health monitor (vibration analysis)
- ⏰ Usage pattern tracker
- 🌡️ Temperature optimizer

### Pick "Security Mode"
**UAD transforms into a smart motion alert system:**
- 🔔 Movement/Tamper alerts
- 🌡️ Room temperature tracker
- 📊 Activity logs
- 📡 LoRa-based backup alerts

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

### UAD App Store
- Select and install hardware "apps" on the fly.
- Auto-generated widgets based on the selected mode.
- Real-time telemetry charts.

### Control Panel
- 📡 Device connection (BLE scan).
- 🤖 Force manual reconfiguration.
- ✨ **Self-Recoding**: Describe a custom use case, and the AI generates the code for you.
- ℹ️ Device info (battery, signal, status).

---

## 🔋 Power Efficiency

**BLE vs WiFi:**
- Idle: 15mA vs 80mA (81% savings)
- Active: 45mA vs 150mA (70% savings)
- Battery life: ~3x longer than typical WiFi IoT devices.

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
❌ Static Hardware: One device, one job.
❌ Fixed Features: Updates limited to what the developer imagined first.
```

### But This:
```
✅ Universal Hardware: One device, infinite jobs.
✅ On-Demand Reconfiguration: You decide what it is today.
✅ AI-Powered Customization: Code generated specifically for your choice.
```

---

## 📊 What Makes UAD Unique

1. **Universal Sensor Platform** - One device, any use case.
2. **The App Store for Hardware** - Redefine your device in seconds.
3. **AI-Powered Self-Coding** - Gemini writes your firmware on the fly.
4. **Phone as Internet Gateway** - No configuration needed for complex WiFi.
5. **Dynamic UI Generation** - Your dashboard changes with your device.
6. **OTA Everything** - Entirely new firmware versions delivered in moments.

---

## 📚 Documentation

- **[Architecture Summary](docs/FINAL_ARCHITECTURE.md)** - Complete architecture overview
- **[Mobile Build Guide](docs/ANDROID_BUILD.md)** - Build mobile app
- **[Testing Scenarios](docs/TESTING_GUIDE.md)** - All test scenarios

---

## 🎉 You Built This

A **modular, AI-powered, universal hardware ecosystem** that:
- Transforms based on your choice 🛠️
- Accesses a library of hardware apps 🏬
- Writes its own code via AI 🤖
- Generates custom UI 🎨
- Updates wirelessly 📡

**Choose your app. UAD does the rest.** ✨
