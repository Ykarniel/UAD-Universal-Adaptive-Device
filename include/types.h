/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    UAD - TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef TYPES_H
#define TYPES_H

#include <stdint.h>

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════════════════

enum ContextType {
    CTX_UNKNOWN   = 0x00,
    CTX_HELMET    = 0x01,
    CTX_BICYCLE   = 0x02,
    CTX_ASSET     = 0x03,
    CTX_VEHICLE   = 0x04
};

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CODES
// ═══════════════════════════════════════════════════════════════════════════

enum StatusCode {
    STATUS_OK         = 0x00,
    STATUS_SOS        = 0x01,
    STATUS_LOW_BATT   = 0x02,
    STATUS_FALL       = 0x03,
    STATUS_IMPACT     = 0x04,
    STATUS_THEFT      = 0x05
};

// ═══════════════════════════════════════════════════════════════════════════
// FSM STATES
// ═══════════════════════════════════════════════════════════════════════════

enum DeviceState {
    STATE_SLEEP,       // Deep sleep (wake on motion/timer/button)
    STATE_DISCOVERY,   // Sampling IMU and classifying context
    STATE_ACTIVE,      // Running context-specific logic
    STATE_TX,          // Transmitting LoRa packet
    STATE_OTA          // Receiving firmware update
};

// ═══════════════════════════════════════════════════════════════════════════
// IMU FEATURES (for classification)
// ═══════════════════════════════════════════════════════════════════════════

struct IMUFeatures {
    float mean_accel;         // Average acceleration magnitude (g)
    float variance;           // Variance of acceleration
    float spectral_energy;    // Total energy in frequency domain
    float dominant_freq;      // Peak frequency (Hz)
    float peak_accel;         // Maximum acceleration spike (g)
};

// ═══════════════════════════════════════════════════════════════════════════
// LORA PACKET (6 bytes)
// ═══════════════════════════════════════════════════════════════════════════

struct __attribute__((packed)) UAD_Packet {
    uint8_t device_id;        // Unique device ID
    uint8_t context_id;       // ContextType enum
    uint8_t status_code;      // StatusCode enum
    uint16_t sensor_val;      // Context-dependent data
    uint8_t battery_pct;      // 0-100%
};

// ═══════════════════════════════════════════════════════════════════════════
// SENSOR DATA (raw readings)
// ═══════════════════════════════════════════════════════════════════════════

struct SensorData {
    float accel_x, accel_y, accel_z;   // Accelerometer (g)
    float gyro_x, gyro_y, gyro_z;      // Gyroscope (deg/s)
    float temperature;                  // Celsius
    unsigned long timestamp;            // millis()
};

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRY DATA (context-specific output)
// ═══════════════════════════════════════════════════════════════════════════

struct TelemetryData {
    uint16_t sensor_val;      // Packed value for LoRa transmission
    StatusCode status;        // Current status
};

#endif // TYPES_H
