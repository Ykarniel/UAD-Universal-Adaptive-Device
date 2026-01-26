# UAD Mobile App Architecture

## 📱 Phone Connection via BLE

UAD connects to your smartphone via **Bluetooth Low Energy (BLE)**:

```
UAD Device ←→ BLE ←→ Your Phone ←→ Internet ←→ Cloud AI
     ↕
   LoRa (only for UAD-to-UAD mesh)
     ↕
Other UAD Devices
```

## Why This Architecture?

### ✅ Advantages

1. **No WiFi Required**: Device doesn't need WiFi credentials
2. **Lower Power**: BLE uses ~10mA vs WiFi ~120mA
3. **Always Available**: Your phone is always with you
4. **Better Range**: BLE works up to 100m (vs WiFi hotspot range)
5. **Mesh Network**: LoRa creates UAD-to-UAD communication
6. **Mobile Data**: Uses your phone's internet (WiFi or cellular)

### 🎯 Use Cases

#### Scenario 1: Guitar Practice (Solo)
```
Guitar UAD → BLE → Phone → Internet → Gemini API
                                    ↓
                            Generates GuitarModule
                                    ↓
                            Phone downloads OTA
                                    ↓
                            Phone sends to UAD via BLE
```

#### Scenario 2: Construction Site (Team)
```
Worker 1 UAD ─┐
Worker 2 UAD ─┼→ LoRa Mesh ←→ Gateway UAD → WiFi → Cloud
Worker 3 UAD ─┘
```

Each worker's phone shows their own UAD's data, but gateway collects all for site manager.

## Mobile App Features

### 1. Real-Time Dashboard
- Same React dashboard, wrapped in React Native or Capacitor
- Shows current context mode
- Live telemetry charts
- Battery status

### 2. Internet Proxy
- Receives AI analysis requests from UAD via BLE
- Forwards to backend API using phone's internet
- Returns results to UAD

### 3. OTA Updates
- Downloads firmware modules from backend
- Transfers to UAD via BLE
- Progress bar during update

### 4. Configuration
- Set device name
- Configure LoRa frequency/power
- Calibrate sensors
- View logs

### 5. Mesh Network View
- See nearby UADs (via LoRa)
- Group messaging
- Emergency broadcasts

## Communication Protocols

### BLE → Phone (JSON)

**Telemetry:**
```json
{
  "context": 1,      // 1=Helmet, 2=Bicycle, etc.
  "status": 0,       // 0=OK, 1=SOS, 3=Fall
  "value": 350,      // Context-dependent (e.g., 3.5G)
  "battery": 85
}
```

**AI Request:**
```json
{
  "type": "ai_analysis",
  "data": {
    "mean_accel": 1.05,
    "variance": 0.342,
    "dominant_freq": 220.0
  }
}
```

### Phone → UAD (Commands)

**Module Installation:**
```json
{
  "type": "ota_update",
  "module": "guitar",
  "size": 245760,
  "chunks": 240
}
```

**Configuration:**
```json
{
  "type": "config",
  "lora_power": 14,
  "tx_interval": 10000
}
```

## Implementation Options

### Option 1: Capacitor (Recommended)
Use existing React dashboard + Capacitor plugins:

```bash
cd dashboard
npm install @capacitor/core @capacitor/cli @capacitor/bluetooth-le
npx cap init
npx cap add android
npx cap add ios
```

**Pros:**
- Reuse existing React code
- Single codebase for web + mobile
- Easy updates

**Cons:**
- Larger app size
- Slightly slower than native

### Option 2: React Native
Build native mobile app:

```bash
npx react-native init UADApp
# Add BLE library
npm install react-native-ble-plx
```

**Pros:**
- Better performance
- Native feel
- Smaller app size

**Cons:**
- Need to rewrite dashboard
- Separate codebase

### Option 3: Flutter
Cross-platform with Dart:

**Pros:**
- Very performant
- Beautiful UI out-of-box

**Cons:**
- Can't reuse React code
- New language (Dart)

## Recommended: Capacitor + Existing Dashboard

Let's use Capacitor to wrap your existing React dashboard:

### Step 1: Add Capacitor

```bash
cd c:/Dev/UAD/dashboard
npm install @capacitor/core @capacitor/cli
npx cap init uad-app com.uad.app UAD
```

### Step 2: Add BLE Plugin

```bash
npm install @capacitor-community/bluetooth-le
npx cap sync
```

### Step 3: Update DeviceContext

```javascript
// dashboard/src/contexts/DeviceContext.jsx
import { BleClient } from '@capacitor-community/bluetooth-le';

// Replace WebSocket with BLE
useEffect(() => {
  async function connectBLE() {
    await BleClient.initialize();
    
    const device = await BleClient.requestDevice({
      services: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b']
    });
    
    await BleClient.connect(device.deviceId);
    
    // Start listening for telemetry
    await BleClient.startNotifications(
      device.deviceId,
      '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
      'beb5483e-36e1-4688-b7f5-ea07361b26a8',
      (value) => {
        const json = new TextDecoder().decode(value);
        const data = JSON.parse(json);
        updateDeviceData(data);
      }
    );
  }
  
  connectBLE();
}, []);
```

### Step 4: Build Mobile App

```bash
npx cap add android
npx cap open android  # Opens Android Studio

# For iOS:
npx cap add ios
npx cap open ios  # Opens Xcode
```

## LoRa Mesh Network

UADs communicate with each other using LoRa for:

### 1. Emergency Broadcasts
```
Worker falls → Helmet UAD detects
            ↓
        LoRa broadcast: "FALL ALERT Worker #3"
            ↓
    All nearby UADs receive
            ↓
    Forward to phones via BLE
```

### 2. Location Tracking
```
Gateway UAD (stationary at entrance)
    ↓ LoRa ping
Worker UADs respond with ID + RSSI
    ↓
Gateway calculates rough positions
    ↓
Sends to cloud via WiFi
```

### 3. Group Messaging
```
Manager's phone → Gateway UAD → LoRa → All worker UADs
"Break time in 5 minutes"
```

## Power Consumption

With BLE instead of WiFi:

| Mode | WiFi | BLE | Savings |
|------|------|-----|---------|
| Idle | 80mA | 15mA | **81%** |
| Active | 150mA | 45mA | **70%** |
| Transmit | 200mA | 50mA | **75%** |

**Battery life improvement**: ~3x longer! 🎉

## Next Steps

1. ✅ BLE Manager implemented ([ble_manager.h](file:///c:/Dev/UAD/src/managers/ble_manager.h))
2. ⏳ Add Capacitor to dashboard  
3. ⏳ Implement BLE in DeviceContext
4. ⏳ Build Android/iOS app
5. ⏳ Test OTA via BLE
6. ⏳ Add LoRa mesh messaging

Want me to implement the Capacitor integration now?
