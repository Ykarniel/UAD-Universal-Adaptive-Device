/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    HELMET MODULE - Safety & Fall Detection
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Context-specific logic for construction helmet use case
 * Adapted from SmartHelmetClip fall_detector.h
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef HELMET_MODULE_H
#define HELMET_MODULE_H

#include <Arduino.h>
#include "../include/config.h"
#include "../include/types.h"

class HelmetModule {
private:
    bool inFreeFall = false;
    unsigned long freeFallStart = 0;
    bool fallDetected = false;
    float lastImpact = 0;
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ───────────────────────────────────────────────────────────────────────
    
    void init() {
        pinMode(VIB_MOTOR_PIN, OUTPUT);
        pinMode(LED_PIN, OUTPUT);
        
        Serial.println("[HELMET] ✅ Helmet mode activated");
        Serial.println("[HELMET] Features: Fall detection, SOS button, haptic alerts");
        
        // Flash LED to indicate helmet mode
        for (int i = 0; i < 3; i++) {
            digitalWrite(LED_PIN, HIGH);
            delay(100);
            digitalWrite(LED_PIN, LOW);
            delay(100);
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // UPDATE (call in main loop with sensor data)
    // ───────────────────────────────────────────────────────────────────────
    
    void update(SensorData data) {
        float magnitude = sqrt(
            data.accel_x * data.accel_x +
            data.accel_y * data.accel_y +
            data.accel_z * data.accel_z
        ) / 9.81;  // Convert to g
        
        // Fall detection state machine
        if (!inFreeFall) {
            // Check for free-fall (weightlessness)
            if (magnitude < FREEFALL_THRESHOLD) {
                inFreeFall = true;
                freeFallStart = millis();
                Serial.println("[HELMET] ⚠️ Free-fall detected!");
            }
        } else {
            // In free-fall, check for impact
            if (magnitude > IMPACT_THRESHOLD) {
                if (millis() - freeFallStart < FALL_WINDOW_MS) {
                    // FALL DETECTED!
                    fall Detected = true;
                    lastImpact = magnitude;
                    Serial.printf("[HELMET] 🚨 FALL DETECTED! Impact: %.2fg\n", magnitude);
                    triggerAlert();
                }
                inFreeFall = false;
            }
            // Timeout - wasn't a fall
            else if (millis() - freeFallStart > FALL_WINDOW_MS) {
                inFreeFall = false;
            }
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GET TELEMETRY DATA
    // ───────────────────────────────────────────────────────────────────────
    
    TelemetryData getTelemetry() {
        TelemetryData data;
        
        // Encode impact force * 100 (e.g., 3.5g -> 350)
        data.sensor_val = (uint16_t)(lastImpact * 100);
        
        if (fallDetected) {
            data.status = STATUS_FALL;
        } else {
            data.status = STATUS_OK;
        }
        
        return data;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // HANDLE ALERT (SOS button pressed)
    // ───────────────────────────────────────────────────────────────────────
    
    void handleAlert() {
        Serial.println("[HELMET] 🚨 SOS BUTTON PRESSED!");
        triggerAlert();
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // TRIGGER ALERT (vibration + LED)
    // ───────────────────────────────────────────────────────────────────────
    
    void triggerAlert() {
        // Vibration pattern: 3 strong pulses
        for (int i = 0; i < 3; i++) {
            analogWrite(VIB_MOTOR_PIN, 255);
            digitalWrite(LED_PIN, HIGH);
            delay(300);
            analogWrite(VIB_MOTOR_PIN, 0);
            digitalWrite(LED_PIN, LOW);
            delay(200);
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CHECK & CLEAR FALL FLAG
    // ───────────────────────────────────────────────────────────────────────
    
    bool isFallDetected() {
        if (fallDetected) {
            fallDetected = false;  // Clear after reading
            return true;
        }
        return false;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DEBUG
    // ───────────────────────────────────────────────────────────────────────
    
    void printDebug() {
        Serial.printf("[HELMET] State: %s | Last Impact: %.2fg\n",
                      inFreeFall ? "FREE-FALL" : "NORMAL",
                      lastImpact);
    }
};

#endif // HELMET_MODULE_H
