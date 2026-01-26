/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    POWER MANAGER - Battery & Sleep Optimization
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Manages deep sleep, battery monitoring, and adaptive power modes
 * Adapted from SmartHelmetClip power_manager.h
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef POWER_MANAGER_H
#define POWER_MANAGER_H

#include <Arduino.h>
#include <esp_sleep.h>
#include <driver/rtc_io.h>
#include "../include/config.h"

// Power modes
enum PowerMode {
    POWER_FULL,     // All systems active (~150mA)
    POWER_IDLE,     // Reduced polling (~80mA)
    POWER_SLEEP,    // Deep sleep (~5mA)
    POWER_ALERT     // Emergency mode (~200mA)
};

class PowerManager {
private:
    PowerMode currentMode = POWER_FULL;
    unsigned long lastActivity = 0;
    unsigned long lastMotion = 0;
    int batteryPercent = 100;
    bool isMoving = true;
    
    // Motion tracking
    static const int MOTION_SAMPLES = 10;
    float motionHistory[MOTION_SAMPLES];
    int motionIndex = 0;
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ───────────────────────────────────────────────────────────────────────
    
    void begin() {
        lastActivity = millis();
        lastMotion = millis();
        memset(motionHistory, 0, sizeof(motionHistory));
        
        // Configure wake-up sources
        esp_sleep_enable_ext0_wakeup((gpio_num_t)BTN_PIN, 0);  // Button wake
        
        Serial.println("[POWER] ✅ Power manager initialized");
        Serial.println("[POWER] Wake sources: button, timer, IMU interrupt");
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // BATTERY MONITORING
    // ───────────────────────────────────────────────────────────────────────
    
    int getBatteryPercent() {
        // Read ADC voltage
        int raw = analogRead(BATT_SENSE_PIN);
        float voltage = (raw / 4095.0) * 3.3 * BATT_VOLTAGE_DIVIDER;
        
        // Map voltage to percentage (3.0V = 0%, 4.2V = 100%)
        float percent = ((voltage - BATT_MIN_VOLTAGE) / 
                        (BATT_MAX_VOLTAGE - BATT_MIN_VOLTAGE)) * 100.0;
        
        batteryPercent = constrain((int)percent, 0, 100);
        return batteryPercent;
    }
    
    float getBatteryVoltage() {
        int raw = analogRead(BATT_SENSE_PIN);
        return (raw / 4095.0) * 3.3 * BATT_VOLTAGE_DIVIDER;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // MOTION TRACKING
    // ───────────────────────────────────────────────────────────────────────
    
    void registerMotion(float magnitude) {
        motionHistory[motionIndex] = magnitude;
        motionIndex = (motionIndex + 1) % MOTION_SAMPLES;
        
        // Calculate average motion
        float avgMotion = 0;
        for (int i = 0; i < MOTION_SAMPLES; i++) {
            avgMotion += motionHistory[i];
        }
        avgMotion /= MOTION_SAMPLES;
        
        // Update moving state
        if (avgMotion > MOTION_THRESHOLD) {
            isMoving = true;
            lastMotion = millis();
        } else if (millis() - lastMotion > 10000) {
            isMoving = false;
        }
    }
    
    bool isDeviceMoving() {
        return isMoving;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // POWER MODE CONTROL
    // ───────────────────────────────────────────────────────────────────────
    
    void setMode(PowerMode mode) {
        if (mode == currentMode) return;
        
        currentMode = mode;
        
        switch (mode) {
            case POWER_FULL:
                Serial.println("[POWER] Mode: FULL (~150mA)");
                break;
            case POWER_IDLE:
                Serial.println("[POWER] Mode: IDLE (~80mA)");
                break;
            case POWER_SLEEP:
                Serial.println("[POWER] Mode: SLEEP (~5mA)");
                break;
            case POWER_ALERT:
                Serial.println("[POWER] Mode: ALERT (~200mA)");
                break;
        }
    }
    
    PowerMode getMode() {
        return currentMode;
    }
    
    void registerActivity() {
        lastActivity = millis();
        if (currentMode == POWER_IDLE) {
            setMode(POWER_FULL);
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DEEP SLEEP
    // ───────────────────────────────────────────────────────────────────────
    
    void enterDeepSleep(int seconds) {
        Serial.printf("[POWER] 😴 Entering deep sleep for %d seconds\n", seconds);
        Serial.println("[POWER] Wake sources: button press, timer");
        
        // Configure timer wake
        esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
        
        // Enter deep sleep
        esp_deep_sleep_start();
    }
    
    // Configure IMU interrupt wake (to be called after IMU setup)
    void enableIMUWake(uint8_t pin) {
        esp_sleep_enable_ext0_wakeup((gpio_num_t)pin, 1);  // Wake on HIGH
        Serial.printf("[POWER] ✅ IMU wake enabled on GPIO%d\n", pin);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // AUTO POWER MANAGEMENT
    // ───────────────────────────────────────────────────────────────────────
    
    void update() {
        unsigned long inactiveTime = millis() - lastActivity;
        
        // Don't auto-sleep during alerts
        if (currentMode == POWER_ALERT) return;
        
        // Auto transitions
        if (currentMode == POWER_FULL && inactiveTime > IDLE_TIMEOUT) {
            setMode(POWER_IDLE);
        }
        
        // Auto wake on motion
        if (currentMode != POWER_FULL && isMoving) {
            setMode(POWER_FULL);
        }
        
        // Force power save on critical battery
        int batt = getBatteryPercent();
        if (batt <= 10 && currentMode != POWER_ALERT) {
            Serial.println("[POWER] ⚠️ CRITICAL BATTERY - forcing idle");
            setMode(POWER_IDLE);
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DEBUG
    // ───────────────────────────────────────────────────────────────────────
    
    void printStatus() {
        const char* modeNames[] = {"FULL", "IDLE", "SLEEP", "ALERT"};
        Serial.printf("[POWER] Mode: %s | Battery: %d%% (%.2fV) | Moving: %s | Inactive: %lus\n",
                      modeNames[currentMode],
                      getBatteryPercent(),
                      getBatteryVoltage(),
                      isMoving ? "YES" : "NO",
                      (millis() - lastActivity) / 1000);
    }
};

#endif // POWER_MANAGER_H
