/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    BICYCLE MODULE - Activity & Route Tracking
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef BICYCLE_MODULE_H
#define BICYCLE_MODULE_H

#include <Arduino.h>
#include "../include/config.h"
#include "../include/types.h"

class BicycleModule {
private:
    float currentSpeed = 0;        // km/h
    float leanAngle = 0;           // degrees
    bool isMoving = false;
    unsigned long lastSpeedUpdate = 0;
    
public:
    void init() {
        Serial.println("[BICYCLE] ✅ Bicycle mode activated");
        Serial.println("[BICYCLE] Features: Speed estimation, lean angle, activity tracking");
        
        // Blue LED blink pattern
        pinMode(LED_PIN, OUTPUT);
        for (int i = 0; i < 2; i++) {
            digitalWrite(LED_PIN, HIGH);
            delay(200);
            digitalWrite(LED_PIN, LOW);
            delay(100);
        }
    }
    
    void update(SensorData data) {
        // Estimate speed from acceleration integration (simplified)
        float accel_magnitude = sqrt(
            data.accel_x * data.accel_x +
            data.accel_y * data.accel_y
        ) / 9.81;
        
        // Moving detection
        isMoving = (accel_magnitude > 0.3);
        
        // Lean angle from gyro Y-axis
        leanAngle = data.gyro_y * 0.1;  // Simplified calculation
        leanAngle = constrain(leanAngle, -45, 45);
        
        // Speed estimation (very basic - would need GPS for accuracy)
        if (isMoving && millis() - lastSpeedUpdate > 1000) {
            currentSpeed = accel_magnitude * 10;  // Rough estimate
            currentSpeed = constrain(currentSpeed, 0, 50);
            lastSpeedUpdate = millis();
        }
    }
    
    TelemetryData getTelemetry() {
        TelemetryData data;
        
        // Encode speed * 10 (e.g., 24.5 km/h -> 245)
        data.sensor_val = (uint16_t)(currentSpeed * 10);
        data.status = STATUS_OK;
        
        return data;
    }
    
    void handleAlert() {
        Serial.println("[BICYCLE] ⚠️ Alert triggered");
    }
    
    void printDebug() {
        Serial.printf("[BICYCLE] Speed: %.1f km/h | Lean: %.1f° | Moving: %s\n",
                      currentSpeed, leanAngle, isMoving ? "YES" : "NO");
    }
};

#endif // BICYCLE_MODULE_H
