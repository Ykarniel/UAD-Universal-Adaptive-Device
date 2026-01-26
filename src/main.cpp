/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    UAD - UNIVERSAL ADAPTIVE DEVICE
 *                   Single-Purpose Adaptive Shell v2.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This firmware acts as a HOST OS. It does not contain game logic.
 * It provides:
 * 1. Hardware abstraction (Sensors, LoRa, Power)
 * 2. OTA Update Capability (Self-rewriting)
 * 3. A container for ONE "Active Module" at a time
 * 
 * To change the device purpose, the AI generates a new "current_module.h"
 * and recompiles this shell.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>

#include "managers/sensor_manager.h"
#include "managers/lora_manager.h"
#include "managers/power_manager.h"
#include "managers/ble_manager.h"
#include "managers/display_manager.h" // Added Display Manager

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL SERVICES
// ═══════════════════════════════════════════════════════════════════════════

SensorManager sensor;
LoRaManager lora;
PowerManager power;
BLEManager ble;
DisplayManager display; // Global OLED instance

// WiFi Credentials (TODO: Move to secrets or BLE-provisioning)
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASS";
const char* BACKEND_URL = "http://192.168.1.100:3000"; // Your PC IP
// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC MODULE INJECTION
// ═══════════════════════════════════════════════════════════════════════════
// The AI overwrites this file before compilation
#include "current_module.h"

// ⚠️ ARCHITECTURE CONSTRAINT:
// The file "current_module.h" MUST define a class named "CurrentModule"
// or a typedef: "using CurrentModule = SpecificClassName;"
// This allows main.cpp to be completely agnostic of what logic is running.

CurrentModule currentModule;

// ═══════════════════════════════════════════════════════════════════════════
// OTA UPDATE LOGIC
// ═══════════════════════════════════════════════════════════════════════════

void checkForUpdates() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.begin(String(BACKEND_URL) + "/api/firmware/check?device_id=" + String(DEVICE_ID));
    int code = http.GET();

    if (code == 200) {
        String payload = http.getString();
        // If update available... logic here
        // This would perform the HTTP Update stream
        // For now, we keep it simple.
    }
    http.end();
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

void setup() {
    Serial.begin(DEBUG_BAUD);
    delay(1000); // safety delay

    Serial.println("\n\n╔════════════════════════════════════════════════╗");
    Serial.println("║         UAD: ADAPTIVE SHELL OS v2.0            ║");
    Serial.println("╚════════════════════════════════════════════════╝");

    // 1. Initialize Hardware Abstraction Layer
    Serial.println("[OS] 🛠️ Initializing Hardware...");
    
    // Initialize Display first so we can show errors
    display.begin();
    
    if (!sensor.begin()) {
        Serial.println("[OS] ❌ Sensor Fail! Halting.");
        display.showStatus("BOOT ERROR", "Sensor Fail", 1);
        while(1) delay(100);
    }
    
    power.begin();
    lora.begin();
    ble.begin("UAD-Device");

    // 2. Connect to Connectivity Layer (Optional)
    // Serial.println("[OS] 📡 Connecting to WiFi...");
    // WiFi.begin(WIFI_SSID, WIFI_PASS); 
    // (Skipping blocking wait to ensure device works offline)

    // 3. Initialize The Active Module
    Serial.println("[OS] 🚀 Booting Active Module...");
    currentModule.init();

    Serial.println("[OS] ✅ Boot Complete. Handing control to Module.\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════

void loop() {
    // 1. System Maintenance
    ble.update();
    
    // 2. Read Fresh Data
    SensorData data;
    sensor.readSensorData(data); // Fill struct with Accel/Gyro/Temp

    // Wake Screen on Motion (Simple threshold > 1.2g or < 0.8g)
    float totalG = sqrt(data.accel_x*data.accel_x + data.accel_y*data.accel_y + data.accel_z*data.accel_z)/9.81;
    if (totalG > 1.2 || totalG < 0.8) {
        display.wake();
    }

    // 3. Run Active Module Logic
    // The device IS the module now. No switching.
    currentModule.update(data);
    
    // Auto-dim check
    display.checkPowerSave();

    // 4. Handle System-Level Telemetry (LoRa/BLE)
    static unsigned long lastTx = 0;
    if (millis() - lastTx > 5000) {
        TelemetryData telem = currentModule.getTelemetry();
        
        // Inject system stats (Battery)
        uint8_t batt = power.getBatteryPercent();

        // Broadcast current state
        if (ble.isConnected()) {
             // ble.sendTelemetry(...) 
        }
        
        // Log for debug
        currentModule.printDebug();
        
        lastTx = millis();
    }
    
    // 5. Check for OTA (Periodically or on BLE Command)
    // ...

    delay(10); // Stability
}
