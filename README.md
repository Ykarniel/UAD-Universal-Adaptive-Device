<p align="center">
  <img src="https://img.shields.io/badge/Platform-ESP32--S3-E7352C?style=for-the-badge&logo=espressif" alt="ESP32-S3"/>
  <img src="https://img.shields.io/badge/Language-C++-00599C?style=for-the-badge&logo=cplusplus" alt="C++"/>
  <img src="https://img.shields.io/badge/AI-Gemini-4285F4?style=for-the-badge&logo=google-gemini" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/Frontend-React%20/%20Capacitor-61DAFB?style=for-the-badge&logo=react" alt="React Native"/>
</p>

# 📱 Universal Adaptive Device (UAD)

A **universal hardware ecosystem** that redefines itself through an AI-powered "Hardware App Store" and real-time firmware synthesis.

---

## 🎉 The Vision

Traditional IoT devices are fixed in their purpose. **UAD** is the "Smartphone of IoT"—a single, high-performance hardware unit that can transform into any device you need. Whether you need a high-precision guitar tuner today or a bike security system tomorrow, UAD reconfigures its entire firmware and user interface to match your choice.

---

## 🚀 Key Innovation: AI Firmware Synthesis & "OTA Hot-Swapping"

UAD moves away from static, hard-coded devices. Through the mobile companion app, users can browse a library of modes or simply describe a new use case in natural language:

1. **Choose or Describe**: Select an application from the UAD Store or type a custom prompt (e.g., "Make me a gym rep counter").
2. **AI-Synthesis**: Gemini AI analyzes the requirement and generates optimized C++ firmware modules and React dashboard widgets.
3. **OTA Hot-Swapping**: The modular ESP32-S3 architecture supports switching functional capabilities on-the-fly. The custom-built firmware is pushed instantly over-the-air (OTA) via Bluetooth Low Energy (BLE).
4. **Context Awareness**: Integrated **TinyML** allows the device to further adapt its behavior based on real-time environmental data.

---

## 📁 Project Structure

```text
.
├── src/                # ESP32-S3 Firmware (FSM, BLE, Sensors, TinyML)
├── include/            # Hardware configuration and shared types
├── backend/            # AI Compilation Service (Gemini + GCC-Cross)
├── dashboard/          # Adaptive Mobile App (React + Capacitor)
├── docs/               # Technical specs and build guides
└── platformio.ini      # Build system configuration
```

---

## ✨ Features

- ✅ **Natural Language Reconfiguration**: Describe a job, and the AI writes the code.
- ✅ **AI Self-Coding**: Backend automatically synthesizes and compiles C++ modules + React widgets.
- ✅ **OTA Hot-Swapping**: Switch operational modes without manual cable flashing.
- ✅ **TinyML Integration**: Real-time on-device sensor fusion and pattern recognition.
- ✅ **BLE Internet Proxy**: Uses your phone's connection—no local WiFi required for cloud updates.
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
- Open the UAD companion app and pick a mode: Guitar, Bike, Door, Dog, Drill, etc. Or describe your own!

### Step 2: Connect
- Tap "📡 Connect to UAD" to pair with your hardware via Bluetooth.

### Step 3: AI Generation
- The backend uses Gemini to generate the specific logic for your selected mode.

### Step 4: OTA Update
- Your phone downloads the newly synthesized firmware and sends it to the UAD device via BLE.

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

### Pick "Gym Mode" (Generated via Prompt)
**UAD transforms into a fitness tracker:**
- 🏋️ Dumbbell rep counter (using IMU data)
- 📈 Set-by-set intensity analysis
- 🔥 Calorie burn estimation
- ⏱️ Rest time management

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

## 🔋 Power Efficiency

**BLE vs WiFi:**
- Idle: 15mA vs 80mA (81% savings)
- Active: 45mA vs 150mA (70% savings)
- Battery life: ~3x longer than typical WiFi IoT devices.

---

## 📚 Documentation

- **[Architecture Summary](docs/FINAL_ARCHITECTURE.md)** - Complete architecture overview
- **[Mobile Build Guide](docs/ANDROID_BUILD.md)** - Build mobile app
- **[Testing Scenarios](docs/TESTING_GUIDE.md)** - All test scenarios

---

## 🎉 You Built This

A **modular, AI-powered, universal hardware ecosystem** that:
- Transforms based on your prompt 🛠️
- Accesses a library of hardware apps 🏬
- Writes its own code via AI 🤖
- Generates custom UI 🎨
- Updates wirelessly 📡

**Choose your app. UAD does the rest.** ✨
