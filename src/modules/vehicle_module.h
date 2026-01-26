/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    VEHICLE MODULE - Driving Pattern Analysis
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef VEHICLE_MODULE_H
#define VEHICLE_MODULE_H

#include <Arduino.h>
#include "../include/config.h"
#include "../include/types.h"

class VehicleModule {
private:
    float engineVibration = 0;
    bool crashDetected = false;
    bool isIdle = false;
    
public:
    void init() {
        Serial.println("[VEHICLE] ✅ Vehicle mode activated");
        Serial.println("[VEHICLE] Features: Crash detection, driving pattern analysis");
    }
    
    void update(SensorData data) {
        float magnitude = sqrt(
            data.accel_x * data.accel_x +
            data.accel_y * data.accel_y +
            data.accel_z * data.accel_z
        ) / 9.81;
        
        // Crash detection (sudden deceleration > 5G)
        if (magnitude > 5.0) {
            crashDetected = true;
            Serial.printf("[VEHICLE] 🚨 CRASH DETECTED! Force: %.2fg\n", magnitude);
        }
        
        // Engine vibration estimation
        engineVibration = magnitude;
        isIdle = (magnitude < 1.2 && magnitude > 0.8);
    }
    
    TelemetryData getTelemetry() {
        TelemetryData data;
        data.sensor_val = (uint16_t)(engineVibration * 100);
        data.status = crashDetected ? STATUS_IMPACT : STATUS_OK;
        
        if (crashDetected) crashDetected = false;  // Clear after sending
        
        return data;
    }
    
    void handleAlert() {
        Serial.println("[VEHICLE] 🚨 Emergency alert");
    }
    
    void printDebug() {
        Serial.printf("[VEHICLE] Vibration: %.2fg | Idle: %s\n",
                      engineVibration, isIdle ? "YES" : "NO");
    }
};

#endif // VEHICLE_MODULE_H
