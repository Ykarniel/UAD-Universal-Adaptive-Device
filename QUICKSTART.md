# UAD Project - Quick Start Guide

## Getting Started

### Dashboard Demo (No Hardware Required)

```bash
cd c:/Dev/UAD/dashboard
npm install
npm run dev
```

Open **http://localhost:5173** and watch the dashboard automatically cycle through contexts:
- **HELMET** (orange) → **BICYCLE** (blue) → **ASSET** (green) → **DISCOVERY** (purple)

### Firmware (Requires ESP32-S3 + MPU6050 + LoRa)

1. **Install PlatformIO** (if not already):
   ```bash
   pip install platformio
   ```

2. **Build & Upload**:
   ```bash
   cd c:/Dev/UAD
   pio run -e uad_main -t upload
   pio device monitor
   ```

3. **Watch Serial Output**:
   ```
   [MAIN] 🔍 Entering DISCOVERY mode...
   [SENSOR] 📊 Sampling IMU...
   [CONTEXT] ✅ BICYCLE detected (freq: 1.8Hz, var: 0.412)
   [BICYCLE] ✅ Bicycle mode activated
   ```

## Configuration

### 1. Set Gemini API Key

Edit `src/ai_analyzer.h` line 16:
```cpp
#define GEMINI_API_KEY "your-actual-api-key-here"
```

Get key from: https://makersuite.google.com/app/apikey

### 2. WiFi Credentials (for AI features)

In `main.cpp`, add:
```cpp
ai.connectWiFi("Your_SSID", "Your_Password");
```

### 3. LoRa Frequency

Edit `include/config.h` line 26:
```cpp
#define LORA_FREQUENCY 915.0  // US
// OR
#define LORA_FREQUENCY 868.0  // EU
```

## Testing Context Detection

### Simulate Helmet Mode
- Shake device vigorously (simulates worker walking)
- Drop from 30cm height (triggers fall detection)
- Press SOS button (GPIO 0)

### Simulate Bicycle Mode
- Move device rhythmically at ~1-2Hz (simulates pedaling)
- Tilt side-to-side (lean angle calculation)

### Simulate Asset Mode
- Leave device completely still for >5 seconds

### Trigger AI Analysis
- Unknown patterns automatically enter DISCOVERY mode
- Purple theme on dashboard
- Connect WiFi to send to Gemini API

## Dashboard Features

### Real-Time Telemetry
- Battery level (top-right)
- Connection status (green/red dot)
- Context name (top-left)
- RSSI signal strength

### Context-Specific Widgets
- **Helmet**: Impact force gauge, fall log, SOS button
- **Bicycle**: Speed gauge, activity stats, calorie counter
- **Asset**: Stationary timer, theft alerts, motion log
- **Discovery**: AI analysis, sensor recommendations

### Theme Switching
Happens automatically when device changes context. Smooth 500ms transition.

## File Structure Reference

```
Key Files:
├── src/main.cpp                    # Main FSM
├── src/context_classifier.cpp      # Classification logic
├── src/ai_analyzer.h               # Gemini API integration
├── src/managers/sensor_manager.h   # IMU handling
├── src/modules/helmet_module.h     # Fall detection
├── dashboard/src/App.jsx           # React entry
└── dashboard/src/components/views/ # 4 context views
```

## Troubleshooting

**Dashboard not showing data?**
- Check console for WebSocket errors
- Verify DeviceContext simulated data is running

**Firmware won't compile?**
- Install PlatformIO: `pip install platformio`
- Check library dependencies in `platformio.ini`

**Fall detection not working?**
- Calibrate IMU (keep device still for 10s on startup)
- Adjust `IMPACT_THRESHOLD` in `include/config.h`

**Context not switching?**
- Check `DISCOVERY_INTERVAL` (default 60s)
- Manually trigger with stronger motion patterns

## Next Steps

1. ✅ Run dashboard demo
2. ⏳ Flash firmware to hardware
3. ⏳ Test fall detection with drop
4. ⏳ Connect Gemini API for unknown contexts
5. ⏳ Add GPS module for bicycle speed accuracy

For detailed documentation, see:
- [README.md](file:///c:/Dev/UAD/README.md)
- [design_spec.md](file:///c:/Dev/UAD/design_spec.md)
- [walkthrough.md](file:///C:/Users/yonat/.gemini/antigravity/brain/12db5ea0-714f-4b28-9eea-58e743196369/walkthrough.md)
