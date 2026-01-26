/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    ASSET MODULE - Stationary Tracking & Theft Alert
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef ASSET_MODULE_H
#define ASSET_MODULE_H

#include <Arduino.h>
#include "../include/config.h"
#include "../include/types.h"

class AssetModule {
private:
    unsigned long stationaryStartTime = 0;
    unsigned int minutesStationary = 0;
    bool theftAlarm = false;
    float motionThreshold = 0.5;  // g
    
public:
    void init() {
        stationaryStartTime = millis();
        
        Serial.println("[ASSET] ✅ Asset tracking mode activated");
        Serial.println("[ASSET] Features: Motion detection, theft alert, parking tracking");
        
        // Green LED pattern
        pinMode(LED_PIN, OUTPUT);
        digitalWrite(LED_PIN, HIGH);
        delay(500);
        digitalWrite(LED_PIN, LOW);
    }
    
    void update(SensorData data) {
        float magnitude = sqrt(
            data.accel_x * data.accel_x +
            data.accel_y * data.accel_y +
            data.accel_z * data.accel_z
        ) / 9.81;
        
        // Check for motion (potential theft)
        if (magnitude > motionThreshold) {
            Serial.println("[ASSET] ⚠️ MOTION DETECTED - Possible theft!");
            theftAlarm = true;
            stationaryStartTime = millis();  // Reset timer
        } else {
            theftAlarm = false;
        }
        
        // Update stationary duration
        minutesStationary = (millis() - stationaryStartTime) / 60000;
    }
    
    TelemetryData getTelemetry() {
        TelemetryData data;
        
        // Encode stationary duration in minutes
        data.sensor_val = minutesStationary;
        data.status = theftAlarm ? STATUS_THEFT : STATUS_OK;
        
        return data;
    }
    
    void handleAlert() {
        Serial.println("[ASSET] 🚨 Manual alert triggered");
    }
    
    void printDebug() {
        Serial.printf("[ASSET] Stationary: %u min | Theft alarm: %s\n",
                      minutesStationary, theftAlarm ? "ACTIVE" : "OFF");
    }
};

#endif // ASSET_MODULE_H
