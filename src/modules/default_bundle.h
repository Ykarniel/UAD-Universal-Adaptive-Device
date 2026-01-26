/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    DEFAULT BUNDLE MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * The "Swiss Army Knife" Default Mode.
 * Features:
 * 1. Status Monitor (Battery/Connection)
 * 2. Flashlight (Toggle LED)
 * 3. Simple Level (Accelerometer)
 * 
 * This is what the device runs when not specialized.
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef DEFAULT_BUNDLE_H
#define DEFAULT_BUNDLE_H

#include "../include/types.h"
#include <Arduino.h>

enum class BundleMode {
    STATUS,
    FLASHLIGHT,
    LEVEL
};

class CurrentModule {
private:
    BundleMode mode = BundleMode::STATUS;
    unsigned long lastToggle = 0;
    
public:
    void init() {
        Serial.println("[BUNDLE] Default Multi-Tool Loaded");
        // Ensure LED is output
        #ifdef LED_PIN
        pinMode(LED_PIN, OUTPUT);
        #endif
    }
    
    void update(const SensorData& data) {
        // Simple input to switch modes (e.g. Button or just cycle for demo)
        // For POC, we cycle every 5 seconds if no button
        if (millis() - lastToggle > 5000) {
            lastToggle = millis();
            // Cycle logic: STATUS -> FLASHLIGHT -> LEVEL -> STATUS
            if (mode == BundleMode::STATUS) mode = BundleMode::LEVEL; // Skip flashlight for now to save eyes
            else if (mode == BundleMode::LEVEL) mode = BundleMode::STATUS;
            
            // Visual feedback
            if (mode == BundleMode::STATUS) display.showStatus("DEFAULT", "READY", 0);
            if (mode == BundleMode::LEVEL) Serial.println("[BUNDLE] Mode: LEVEL");
        }
        
        switch (mode) {
            case BundleMode::STATUS:
                // Just idle
                break;
                
            case BundleMode::FLASHLIGHT:
                #ifdef LED_PIN
                digitalWrite(LED_PIN, HIGH);
                #endif
                break;
                
            case BundleMode::LEVEL:
                // Use built-in level viz
                // Calculate simple tilt
                float tilt = data.accel_x; // Simplified
                if (tilt > 0.1) display.showProgressBar("TILT RIGHT", (int)(tilt*100));
                else if (tilt < -0.1) display.showProgressBar("TILT LEFT", (int)(abs(tilt)*100));
                else display.showStatus("LEVEL", "PERFECT", 0);
                break;
        }
    }
    
    TelemetryData getTelemetry() {
        TelemetryData t;
        t.status = STATUS_OK;
        t.sensor_val = (uint16_t)mode; // Send current mode index
        return t;
    }
    
    void printDebug() {
        // Serial.println("Default Bundle Running...");
    }
};

#endif
