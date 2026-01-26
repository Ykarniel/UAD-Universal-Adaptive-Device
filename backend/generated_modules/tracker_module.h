// ═══════════════════════════════════════════════════════════════════════════════
// File: types.h
// Description: Defines shared data structures for sensor input and telemetry output.
// ═══════════════════════════════════════════════════════════════════════════════

#ifndef TYPES_H
#define TYPES_H

#include <cstdint>

// Input structure: Raw data from all sensors
struct SensorData {
    // IMU
    float accelX, accelY, accelZ;
    float gyroX, gyroY, gyroZ;

    // GPS
    bool gpsFix;
    float gpsLat, gpsLon, gpsSpeed, gpsHeading;
    uint8_t gpsSatellites;

    // Environment
    float internalTemp;
    float batteryVoltage;

    // Proximity
    int phoneRssi; // Received Signal Strength Indicator for phone presence
};

// Output structure: Processed data ready for transmission
struct TelemetryData {
    uint8_t schemaVersion = 1;

    // Device State
    uint8_t trackerState; // Corresponds to TrackerModuleState enum
    float batteryLevel;   // Percentage (0-100)
    bool isAlertActive;

    // Motion Features
    float motionIntensity; // Processed from accelerometer

    // Location Data
    bool gpsValid;
    float latitude;
    float longitude;
    float speed;
    float heading;

    // Parked Location (only valid when parked)
    float parkedLatitude;
    float parkedLongitude;
};

#endif // TYPES_H

// ═══════════════════════════════════════════════════════════════════════════════
// File: TrackerModule.h
// Description: Header for the Car GPS Tracker module.
// ═══════════════════════════════════════════════════════════════════════════════

#ifndef TRACKER_MODULE_H
#define TRACKER_MODULE_H

#include "types.h"
#include <Arduino.h>

// State Machine States
enum class TrackerModuleState {
    IDLE,       // Waiting for initial movement (e.g., after boot)
    ACTIVE,     // Car is moving, tracking actively
    MONITORING, // Car is parked, monitoring for theft or movement
    ALERT,      // Theft detected, high-priority alert mode
    LOW_POWER   // Deep sleep to conserve power
};

class TrackerModule {
private:
    TrackerModuleState currentState = TrackerModuleState::IDLE;

    // --- Configuration Constants ---
    // Timing
    static constexpr uint32_t SAMPLE_INTERVAL_ACTIVE = 200;      // 5 Hz when moving
    static constexpr uint32_t SAMPLE_INTERVAL_IDLE = 2000;       // 0.5 Hz when parked
    static constexpr uint32_t PARKED_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of no motion to be considered parked
    static constexpr uint32_t DEEP_SLEEP_TIMEOUT_MS = 30 * 60 * 1000; // 30 mins parked -> deep sleep

    // Thresholds
    static constexpr float MOTION_THRESHOLD_IDLE = 0.05f;  // g-force threshold to consider the car stopped
    static constexpr float MOTION_THRESHOLD_ACTIVE = 0.15f; // g-force threshold to detect movement
    static constexpr int PHONE_RSSI_THRESHOLD = -85;      // RSSI threshold for phone presence (dBm)
    static constexpr float BATTERY_LOW_VOLTAGE = 3.3f;    // Voltage to trigger LOW_POWER state

    // Filtering
    static constexpr float EMA_ALPHA_MOTION = 0.4f;
    static constexpr float EMA_ALPHA_BATTERY = 0.1f;

    // --- State Variables ---
    uint32_t lastSampleMs = 0;
    uint32_t lastTransmitMs = 0;
    uint32_t motionlessStartMs = 0;
    bool needsTransmission = false;

    // Filtered & Processed Values
    float filteredMotion = 0.0f;
    float filteredBatteryVolts = 4.2f;

    // Last Known Good Values
    float lastGoodLat = 0.0f;
    float lastGoodLon = 0.0f;
    float lastGoodSpeed = 0.0f;
    float lastGoodHeading = 0.0f;

    // Parked state data
    float parkedLat = 0.0f;
    float parkedLon = 0.0f;

    // --- Private Helper Methods ---
    void applyFilters(const SensorData& data);
    float calculateMotionIntensity(const SensorData& data);
    void updateStateMachine(const SensorData& data);
    void enterDeepSleep();
    void transitionState(TrackerModuleState newState);
    
public:
    // --- Public API ---
    void init();
    void update(const SensorData& data);
    TelemetryData getTelemetry();
    void handleAlert();

    uint32_t getSampleInterval() const;
    bool shouldTransmit() const { return needsTransmission; }
    void onTransmitComplete() { needsTransmission = false; }
};

#endif // TRACKER_MODULE_H

// ═══════════════════════════════════════════════════════════════════════════════
// File: TrackerModule.cpp
// Description: Implementation of the Car GPS Tracker module logic.
// ═══════════════════════════════════════════════════════════════════════════════

// #include "TrackerModule.h" // This would be in a separate .cpp file

// --- Initialization ---

void TrackerModule::init() {
    Serial.begin(115200);
    while(!Serial);
    Serial.println("[TRACKER] Module initializing...");

    // In a real application, initialize hardware here:
    // - MPU6050
    // - NEO-M8N GPS
    // - WS2812B LED
    // - Buzzer
    // - LoRa Radio
    
    // Set initial battery voltage to a reasonable value
    // to avoid immediate low power state on first run.
    filteredBatteryVolts = 4.2f; 

    transitionState(TrackerModuleState::IDLE);
}

// --- Main Update Loop ---

void TrackerModule::update(const SensorData& data) {
    applyFilters(data);
    updateStateMachine(data);

    // Update last known good GPS data only if the fix is valid
    if (data.gpsFix && data.gpsSatellites > 3) {
        lastGoodLat = data.gpsLat;
        lastGoodLon = data.gpsLon;
        lastGoodSpeed = data.gpsSpeed;
        lastGoodHeading = data.gpsHeading;
    }
}

// --- State Machine Logic ---

void TrackerModule::updateStateMachine(const SensorData& data) {
    // Universal check for low battery
    if (filteredBatteryVolts < BATTERY_LOW_VOLTAGE && currentState != TrackerModuleState::LOW_POWER) {
        Serial.println("[TRACKER] Critical battery level detected.");
        transitionState(TrackerModuleState::LOW_POWER);
    }
    
    switch (currentState) {
        case TrackerModuleState::IDLE:
            // From IDLE, we start tracking as soon as any significant motion is detected.
            if (filteredMotion > MOTION_THRESHOLD_ACTIVE) {
                Serial.println("[TRACKER] Motion detected, starting trip.");
                transitionState(TrackerModuleState::ACTIVE);
            }
            break;

        case TrackerModuleState::ACTIVE:
            // Car is moving. Monitor for stopping.
            if (filteredMotion < MOTION_THRESHOLD_IDLE) {
                if (motionlessStartMs == 0) {
                    motionlessStartMs = millis();
                }
                // If motionless for the defined timeout, we consider the car parked.
                if (millis() - motionlessStartMs > PARKED_TIMEOUT_MS) {
                    Serial.println("[TRACKER] Car parked. Storing location.");
                    parkedLat = lastGoodLat;
                    parkedLon = lastGoodLon;
                    transitionState(TrackerModuleState::MONITORING);
                }
            } else {
                // Reset motionless timer if movement is detected.
                motionlessStartMs = 0;
            }
            break;

        case TrackerModuleState::MONITORING:
            // Car is parked. Monitor for movement (potential theft).
            if (filteredMotion > MOTION_THRESHOLD_ACTIVE) {
                // Car is moving again. Check if the owner's phone is nearby.
                if (data.phoneRssi > PHONE_RSSI_THRESHOLD) {
                    Serial.println("[TRACKER] Owner detected. Resuming active tracking.");
                    transitionState(TrackerModuleState::ACTIVE);
                } else {
                    Serial.println("[TRACKER] ALERT! Motion detected without owner's phone nearby!");
                    transitionState(TrackerModuleState::ALERT);
                }
            }
            // Transition to deep sleep if parked for a long time.
            else if (millis() - motionlessStartMs > DEEP_SLEEP_TIMEOUT_MS) {
                Serial.println("[TRACKER] Entering deep sleep to save power.");
                transitionState(TrackerModuleState::LOW_POWER);
            }
            break;

        case TrackerModuleState::ALERT:
            // Alert state is transient. It triggers an immediate action and then
            // transitions to ACTIVE to track the vehicle's location.
            handleAlert();
            transitionState(TrackerModuleState::ACTIVE);
            break;

        case TrackerModuleState::LOW_POWER:
            // In this state, the system's main loop should call enterDeepSleep().
            // This case is a placeholder; the transition itself handles the action.
            enterDeepSleep();
            break;
    }
}

// --- Data Processing & Filtering ---

void TrackerModule::applyFilters(const SensorData& data) {
    // Calculate and smooth motion intensity
    float currentMotion = calculateMotionIntensity(data);
    filteredMotion = (EMA_ALPHA_MOTION * currentMotion) + (1.0f - EMA_ALPHA_MOTION) * filteredMotion;

    // Smooth battery voltage reading
    if (data.batteryVoltage > 2.0f) { // Basic sanity check
        filteredBatteryVolts = (EMA_ALPHA_BATTERY * data.batteryVoltage) + (1.0f - EMA_ALPHA_BATTERY) * filteredBatteryVolts;
    }
}

float TrackerModule::calculateMotionIntensity(const SensorData& data) {
    // Calculate the magnitude of the acceleration vector.
    // Subtract 1.0g (gravity) to get a baseline near zero when stationary.
    float magnitude = sqrt(data.accelX * data.accelX + data.accelY * data.accelY + data.accelZ * data.accelZ);
    return fabs(magnitude - 1.0f);
}

// --- Public API Implementation ---

TelemetryData TrackerModule::getTelemetry() {
    TelemetryData telemetry;
    telemetry.trackerState = static_cast<uint8_t>(currentState);

    // Map voltage to percentage (approximate for LiPo: 3.2V=0%, 4.2V=100%)
    telemetry.batteryLevel = constrain(map(filteredBatteryVolts * 100, 320, 420, 0, 100), 0, 100);
    
    telemetry.isAlertActive = (currentState == TrackerModuleState::ALERT);
    telemetry.motionIntensity = filteredMotion;

    telemetry.gpsValid = (lastGoodLat != 0.0f && lastGoodLon != 0.0f);
    telemetry.latitude = lastGoodLat;
    telemetry.longitude = lastGoodLon;
    telemetry.speed = lastGoodSpeed;
    telemetry.heading = lastGoodHeading;

    telemetry.parkedLatitude = parkedLat;
    telemetry.parkedLongitude = parkedLon;
    
    return telemetry;
}

void TrackerModule::handleAlert() {
    // This function should trigger immediate physical alerts.
    // Example: Flash an LED, sound a buzzer, and force a high-priority transmission.
    Serial.println("!!! ALERT ACTION TRIGGERED !!!");
    // Pseudo-code:
    // rgb_led.set(RED, BLINK_FAST);
    // buzzer.play(ALARM_SOUND);
    needsTransmission = true; // Ensure this alert gets sent ASAP
}

uint32_t TrackerModule::getSampleInterval() const {
    switch(currentState) {
        case TrackerModuleState::ACTIVE:
        case TrackerModuleState::ALERT:
            return SAMPLE_INTERVAL_ACTIVE;
        case TrackerModuleState::IDLE:
        case TrackerModuleState::MONITORING:
        default:
            return SAMPLE_INTERVAL_IDLE;
    }
}

// --- Private Helper Methods ---

void TrackerModule::transitionState(TrackerModuleState newState) {
    if (currentState == newState) return;

    // Logic to execute on exiting a state
    // (currently none needed)

    currentState = newState;
    Serial.print("[TRACKER] State -> ");
    switch (currentState) {
        case TrackerModuleState::IDLE:       Serial.println("IDLE"); break;
        case TrackerModuleState::ACTIVE:     Serial.println("ACTIVE"); break;
        case TrackerModuleState::MONITORING: Serial.println("MONITORING"); break;
        case TrackerModuleState::ALERT:      Serial.println("ALERT"); break;
        case TrackerModuleState::LOW_POWER:  Serial.println("LOW_POWER"); break;
    }

    // Logic to execute on entering a new state
    motionlessStartMs = 0; // Reset timer on any state change
    needsTransmission = true; // Always send an update when the state changes

    if (newState == TrackerModuleState::MONITORING || newState == TrackerModuleState::ACTIVE) {
        // We are considered motionless when entering the parked monitoring state
        motionlessStartMs = millis(); 
    }
}

void TrackerModule::enterDeepSleep() {
    Serial.println("[TRACKER] Entering deep sleep for 15 minutes.");
    // In a real application, you would ensure any pending data is sent here.
    // Then configure a wake-up source (e.g., timer or IMU interrupt).
    esp_sleep_enable_timer_wakeup(15 * 60 * 1000000ULL); // 15 minutes
    esp_deep_sleep_start();
}
