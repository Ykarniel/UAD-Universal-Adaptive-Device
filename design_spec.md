# UAD (Universal Adaptive Device) - Technical Design Specification

## 1. Project Overview

**Objective:** Develop a "Software-Defined Hardware edge ML" node based on ESP32-S3 and LoRa. The device autonomously detects its context (e.g., Construction Helmet, Bicycle, Industrial Machine) using Edge AI (sensor fusion) and adapts its firmware logic, data transmission frequency, and user interface (React Dashboard) accordingly. USER can change its context and widgets OTA but the device creates its own widgets and telemetry and nice data visualizations using LLM and AI.

**Core Innovation:** The device is not single-purpose. It identifies "What am I attached to?" and changes its behavior dynamically.

---

## 2. Technology Stack

* **Firmware:** C++ (Arduino Framework / PlatformIO).
* **MCU:** ESP32-S3 (Selected for AI vector instructions & Deep Sleep capabilities).
* **Comms:** LoRa (SX1262/SX1276) for long-range telemetry.
* **Sensors:** MPU6050 (Accelerometer/Gyroscope) or BNO055.
* **Actuators:** Haptic Motor (Vibration), Momentary Button (Input).
* **Frontend:** React (Vite), Tailwind CSS, Recharts, Capacitor (for mobile PWA).
* **Backend:** Node.js (or Firebase Functions) + Google Gemini API (for unknown context analysis).

---

## 3. Hardware Architecture & Pinout Strategy

**Pin Definitions (ESP32-S3):**

* `I2C_SDA/SCL`: For MPU6050 communication.
* `LORA_MISO/MOSI/SCK/CS/RST/IRQ`: For LoRa Module.
* `VIB_MOTOR_PIN`: PWM output for haptic feedback (requires transistor driver).
* `BTN_PIN`: Input Pullup for Panic/Reset button.
* `BATT_SENSE_PIN`: Analog input (voltage divider) for battery monitoring.

---

## 4. Firmware Architecture (The "Context Engine")

The firmware must operate as a **Finite State Machine (FSM)**.

### A. The State Machine

1. **SLEEP_STATE:** Deep sleep to save power. Wakes up on timer (every X mins) or IMU Motion Interrupt.
2. **DISCOVERY_STATE:**
   * Samples raw IMU data (Acc/Gyro) at 50Hz for 2 seconds.
   * Runs **Feature Extraction** (Mean, Variance, Spectral Energy).
   * Executes `classifyContext()` logic.

3. **ACTIVE_STATE (Context Dependent):**
   * *If HELMET:* Monitor for `Fall_Detect` (>3G impact) and `Free_Fall`. Enable Panic Button.
   * *If BIKE:* Monitor `Lean_Angle` and `Speed_Est`. Transmit often.
   * *If UNKNOWN:* Package raw IMU signature and send to Cloud for GenAI analysis.

4. **TX_STATE:** Pack binary payload and transmit via LoRa.

### B. The Context Algorithm (Heuristic Logic)

* **Stationary:** `Variance < Threshold` for > 5s.
* **Walking/Body:** Rhythmic oscillation (1Hz - 2.5Hz) on Y-axis.
* **Machinery:** High-frequency vibration (>50Hz) with consistent amplitude.
* **Impact:** Instantaneous G-Force vector magnitude > 4G.

---

## 5. Communication Protocol (LoRa Payload)

To conserve airtime, use a **Packed Binary Structure** (Not JSON).

**Packet Structure (6 Bytes):**

```cpp
struct UAD_Packet {
  uint8_t device_id;    // Unique ID
  uint8_t context_id;   // 0x01: Helmet, 0x02: Bike, 0xFF: Unknown
  uint8_t status_code;  // 0x00: OK, 0x01: SOS, 0x02: Low Batt
  uint16_t sensor_val;  // Context dependent (Impact Force OR Speed)
  uint8_t battery_pct;  // 0-100%
};
```

---

## 6. Frontend Architecture (Adaptive Dashboard)

The React application acts as a "Polymorphic Interface."

### A. Context Provider

A global React Context (`DeviceContext`) listens to incoming LoRa messages (via MQTT/Websocket from the gateway).

### B. Dynamic Component Rendering

The main view switches components based on `packet.context_id`:

* `context_id === 0x01 (HELMET)`:
  * **Theme:** Orange/Black (High Contrast).
  * **Components:** `<SafetyStatus />`, `<FallLog />`, `<EvacuationMap />`.

* `context_id === 0x02 (BIKE)`:
  * **Theme:** Blue/White (Fitness style).
  * **Components:** `<SpeedGauge />`, `<RouteMap />`, `<CalorieBurn />`.

* `context_id === 0xFF (UNKNOWN)`:
  * **Theme:** Purple (AI Discovery).
  * **Action:** Shows "Analyzing Purpose..." animation (triggering Gemini API).

---

## 7. Prompts to Drive Cursor (Copy & Paste these)

Use these prompts sequentially in Cursor to build the project.

### Prompt 1: Project Setup (Firmware)

> "Create a PlatformIO project structure for ESP32-S3. I need a modular design with separate header/cpp files for: `SensorManager`, `LoRaManager`, `ContextEngine`, and `PowerManager`. Include libraries for 'Adafruit MPU6050', 'LoRa', and 'ArduinoJson'. Set up the `main.cpp` to initialize these managers."

### Prompt 2: Sensor & Context Logic

> "In `SensorManager`, write a function `getIMUFeatures()` that samples the accelerometer for 2 seconds at 50Hz. Calculate the 'Total Acceleration Vector' and the 'Variance'.
> Then, in `ContextEngine`, write a function that takes these features and returns an Enum: `CTX_HELMET`, `CTX_BIKE`, `CTX_IDLE`. Use thresholds: High variance + rhythmic = BIKE; High spikes = HELMET."

### Prompt 3: LoRa Logic

> "In `LoRaManager`, create a function `sendPacket(uint8_t context, uint8_t status, uint16_t data)`. Pack these values into a byte array (binary payload) rather than JSON to save bandwidth. Implement a function to put the LoRa radio to sleep after transmission."

### Prompt 4: React Adaptive UI

> "Create a React component called `DashboardContainer`. It should take a prop `contextType`. Use a switch statement to render different child components: `HelmetView` (Safety focus), `BikeView` (Stats focus), and `DiscoveryView`. Use Tailwind CSS. If context is Helmet, use an amber color scheme. If Bike, use a cyan color scheme."

### Prompt 5: The GenAI "Self-Writing" Feature

> "Write a Node.js function that receives raw sensor data arrays. It should construct a prompt for the Google Gemini API: 'Analyze this vibration data pattern [array]. Does it look like walking, driving, or heavy machinery? Return only the classification.' Parse the response and update the device context in the database."

---

## 8. Success Criteria for POC

1. **Autonomy:** Device successfully switches from "Idle" to "Helmet Mode" when shaken/moved vigorously.
2. **Safety:** Device triggers Red LED and Vibration when a "Fall" (>4G) is simulated in Helmet Mode.
3. **Adaptability:** React Dashboard updates the UI theme automatically when the device sends a different Context ID.
4. **AI Integration:** Unknown contexts trigger Gemini API analysis and return context suggestions.
5. **Power Efficiency:** Device enters deep sleep between readings and wakes on motion.
6. **OTA Updates:** Firmware can be updated wirelessly to add new context modules.
