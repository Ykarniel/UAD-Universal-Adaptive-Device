# UAD - Backend Compilation Service Setup

## Overview

This backend service uses Gemini AI to:
1. Generate C++ modules for unknown device contexts
2. Compile them with PlatformIO
3. Serve OTA firmware updates
4. Generate React dashboard widgets

## Installation

```bash
cd c:/Dev/UAD/backend
npm install
```

## Configuration

Create `.env` file:
```env
GEMINI_API_KEY=your_api_key_here
UAD_PROJECT_PATH=../
PORT=3000
```

Get Gemini API key from: https://makersuite.google.com/app/apikey

## Run

```bash
npm start
# or for development:
npm run dev
```

Server will run on `http://localhost:3000`

## API Endpoints

### 1. Check for Updates
```
GET /api/modules/check?device_type=guitar
```

**Response:**
```json
{
  "update_available": true,
  "version": "1.0.0",
  "device_type": "guitar",
  "size": 245760
}
```

### 2. Generate New Module (AI)
```
POST /api/modules/generate
{
  "device_type": "guitar",
  "features": {
    "chord_detection": true,
    "tuner": true,
    "practice_timer": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "1706012345678"
}
```

**Process:**
1. Gemini generates C++ module code
2. Code saved to `./generated_modules/guitar_module.h`
3. PlatformIO compiles firmware
4. Binary saved to `./compiled_modules/guitar_module.bin`

### 3. Check Generation Status
```
GET /api/modules/status?job_id=1706012345678
```

**Response:**
```json
{
  "status": "completed",  // or "generating", "compiling", "failed"
  "device_type": "guitar",
  "binary_path": "./compiled_modules/guitar_module.bin"
}
```

### 4. Download Module
```
GET /api/modules/download?device_type=guitar
```

Returns `.bin` firmware file for OTA update

### 5. Generate Widget (React)
```
POST /api/widgets/generate
{
  "device_type": "guitar",
  "data_fields": ["current_chord", "tuning_accuracy", "practice_duration"]
}
```

**Response:**
```json
{
  "success": true,
  "code": "import React from 'react'...",
  "path": "./generated_widgets/guitar_view.jsx"
}
```

## How It Works

### Module Generation Flow

```
Device detects guitar (via sound DSP)
↓
Sends features to backend: /api/modules/generate
↓
Gemini generates C++ code:
  class GuitarModule {
    void init();
    void update(SensorData data);
    TelemetryData getTelemetry();
  };
↓
PlatformIO compiles: pio run -e uad_main
↓
Binary ready: ./compiled_modules/guitar_module.bin
↓
Device downloads via OTA: /api/modules/download
↓
Device reboots with new module!
```

### Widget Generation Flow

```
Dashboard requests widget: POST /api/widgets/generate
↓
Gemini generates React JSX code
↓
Widget saved: ./generated_widgets/guitar_view.jsx
↓
Dashboard fetches: GET /api/widgets/guitar
↓
DynamicWidgetLoader compiles JSX on-client
↓
Widget renders in dashboard!
```

## Directory Structure

```
backend/
├── server.js               # Main server
├── package.json
├── .env                   # API keys (create this)
├── generated_modules/     # AI-generated C++ code
├── compiled_modules/      # Compiled .bin files
└── generated_widgets/     # AI-generated React components
```

## Example: Guitar Detection

When device detects guitar:

**1. Device sends to backend:**
```json
{
  "device_type": "guitar",
  "features": {
    "audio": {
      "dominant_freq": 220.0,
      "harmonic_content": 0.89,
      "fft_peaks": [82.4, 110.0, 146.8, 196.0, 246.9, 329.6]
    }
  }
}
```

**2. Gemini generates C++ module:**
```cpp
class GuitarModule {
private:
  String current_chord = "unknown";
  float tuning_accuracy = 0.0;
  
public:
  void init() {
    Serial.println("[GUITAR] 🎸 Guitar mode activated");
  }
  
  void update(SensorData data) {
    // AI-generated chord detection logic
    current_chord = detectChord(data);
    tuning_accuracy = calculateTuning(data);
  }
  
  TelemetryData getTelemetry() {
    TelemetryData data;
    data.sensor_val = (uint16_t)(tuning_accuracy * 100);
    return data;
  }
};
```

**3. Gemini generates React widget:**
```jsx
const GuitarView = () => {
  const { deviceData } = useDevice();
  
  return (
    <div className="bg-amber-900 text-white">
      <div className="text-6xl">{currentChord}</div>
      <div className="text-3xl">Tuning: {tuningAccuracy}%</div>
    </div>
  );
};
```

**4. Device downloads and installs module**

**5. Dashboard loads new widget**

## Requirements

- Node.js 16+
- PlatformIO CLI (`pip install platformio`)
- Gemini API key
- UAD project at `../` (or configure `UAD_PROJECT_PATH`)

## Troubleshooting

**PlatformIO not found:**
```bash
pip install platformio
# Add to PATH if needed
```

**Compilation fails:**
- Check `UAD_PROJECT_PATH` is correct
- Ensure platformio.ini exists in project
- Check generated C++ code for syntax errors

**Widget not loading:**
- Check CORS settings
- Verify widget saved to `./generated_widgets/`
- Check browser console for errors

## Production Deployment

For production, add:
- Authentication (JWT tokens)
- Rate limiting
- Code sandboxing (no eval())
- HTTPS
- Binary signing for OTA
- Widget caching/CDN
