#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ═══════════════════════════════════════════════════════════════════════════
// HARDWARE DEFINITIONS (Heltec WiFi LoRa 32 V3)
// ═══════════════════════════════════════════════════════════════════════════

#define DEVICE_ID    1
#define DEBUG_BAUD   115200

// ─── BUILT-IN PERIPHERALS ───────────────────────────────────────────────
// OLED Display (Built-in)
#define OLED_SDA     17
#define OLED_SCL     18
#define OLED_RST     21

// LoRa Radio (Built-in SX1262)
#define LORA_SS      8
#define LORA_RST     12
#define LORA_DIO1    14
#define LORA_BUSY    13

// LED & Button
#define LED_PIN      35  // On-board LED

// External Red LED Button
#define EXT_BTN_PIN  6   // Connect button here (connect other side to GND)
#define EXT_LED_PIN  7   // Connect red LED ring here (through 220ohm resistor)

// Battery Voltage Divider (Built-in)
#define BAT_ADC_PIN  1   // Heltec V3 battery read pin (ADC1_CH0)
#define BAT_READ_CTRL 37 // Set LOW to read battery

// ─── EXTERNAL SENSORS ───────────────────────────────────────────────────
// I2C Sensors (MPU6050, BME280) - connecting to external pins
#define SENSOR_SDA   41
#define SENSOR_SCL   42

// I2S Microphone (INMP441)
#define I2S_SD       46  // Serial Data
#define I2S_WS       45  // Word Select (L/R Clock)
#define I2S_SCK      44  // Serial Clock

// Actuators
#define VIB_MOTOR_PIN 4  // PWM capable pin

// ═══════════════════════════════════════════════════════════════════════════
// SOFTWARE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Context Detection
#define IMPACT_THRESHOLD      4.0f   // G-force
#define STATIONARY_VARIANCE   0.05f  // Accel variance
#define WALKING_FREQ_MIN      1.0f   // Hz
#define WALKING_FREQ_MAX      3.0f   // Hz
#define MACHINERY_FREQ_MIN    50.0f  // Hz

// Power Management
#define SLEEP_TIMEOUT_MS      300000 // 5 minutes inactivity
#define BATTERY_CHECK_INT_MS  30000

// LoRa Mesh
#define LORA_FREQ            868.0  // MHz (Israel/EU Standard)
#define LORA_BW              125.0  // kHz
#define LORA_SF              7      // Spreading Factor

#endif // CONFIG_H
