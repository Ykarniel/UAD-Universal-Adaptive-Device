/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    SENSOR MANAGER - IMU Data Acquisition
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles MPU6050/BNO055 initialization, calibration, and feature extraction
 * Adapted from SmartHelmetClip fall_detector.h
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "../include/config.h"
#include "../include/types.h"

class SensorManager {
private:
    Adafruit_MPU6050 mpu;
    bool initialized = false;
    
    // Calibration offsets
    float axOffset = 0, ayOffset = 0, azOffset = 0;
    float gxOffset = 0, gyOffset = 0, gzOffset = 0;
    
    // Sample buffer for feature extraction
    static const int MAX_SAMPLES = IMU_SAMPLE_RATE * (IMU_SAMPLE_DURATION / 1000);
    float accel_buffer[MAX_SAMPLES];
    int sample_count = 0;
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ───────────────────────────────────────────────────────────────────────
    
    bool begin() {
        Wire.begin(I2C_SDA, I2C_SCL);
        
        if (!mpu.begin()) {
            Serial.println("[SENSOR] ❌ Failed to find MPU6050");
            return false;
        }
        
        // Configure MPU6050
        mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
        mpu.setGyroRange(MPU6050_RANGE_500_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
        
        delay(100);
        calibrate();
        
        initialized = true;
        Serial.println("[SENSOR] ✅ MPU6050 initialized and calibrated");
        return true;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CALIBRATION (call at startup when device is stationary)
    // ───────────────────────────────────────────────────────────────────────
    
    void calibrate() {
        Serial.println("[SENSOR] 🔄 Calibrating... keep device still");
        
        float axSum = 0, aySum = 0, azSum = 0;
        float gxSum = 0, gySum = 0, gzSum = 0;
        const int samples = 100;
        
        for (int i = 0; i < samples; i++) {
            sensors_event_t a, g, temp;
            mpu.getEvent(&a, &g, &temp);
            
            axSum += a.acceleration.x;
            aySum += a.acceleration.y;
            azSum += a.acceleration.z;
            
            gxSum += g.gyro.x;
            gySum += g.gyro.y;
            gzSum += g.gyro.z;
            
            delay(10);
        }
        
        axOffset = axSum / samples;
        ayOffset = aySum / samples;
        azOffset = (azSum / samples) - 9.81;  // Remove 1g gravity on Z-axis
        
        gxOffset = gxSum / samples;
        gyOffset = gySum / samples;
        gzOffset = gzSum / samples;
        
        Serial.printf("[SENSOR] ✅ Calibration complete. Accel offsets: %.2f, %.2f, %.2f\n", 
                      axOffset, ayOffset, azOffset);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // READ SENSOR DATA
    // ───────────────────────────────────────────────────────────────────────
    
    bool readSensorData(SensorData &data) {
        if (!initialized) return false;
        
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        
        // Apply calibration
        data.accel_x = a.acceleration.x - axOffset;
        data.accel_y = a.acceleration.y - ayOffset;
        data.accel_z = a.acceleration.z - azOffset;
        
        data.gyro_x = g.gyro.x - gxOffset;
        data.gyro_y = g.gyro.y - gyOffset;
        data.gyro_z = g.gyro.z - gzOffset;
        
        data.temperature = temp.temperature;
        data.timestamp = millis();
        
        return true;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GET ACCELERATION MAGNITUDE (in g's)
    // ───────────────────────────────────────────────────────────────────────
    
    float getAccelMagnitude() {
        SensorData data;
        if (!readSensorData(data)) return 0.0;
        
        // Convert m/s² to g (1g = 9.81 m/s²)
        float gx = data.accel_x / 9.81;
        float gy = data.accel_y / 9.81;
        float gz = data.accel_z / 9.81;
        
        return sqrt(gx*gx + gy*gy + gz*gz);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SAMPLE IMU FOR FEATURE EXTRACTION (2 seconds @ 50Hz)
    // ───────────────────────────────────────────────────────────────────────
    
    IMUFeatures getIMUFeatures() {
        IMUFeatures features = {0};
        sample_count = 0;
        
        Serial.println("[SENSOR] 📊 Sampling IMU for feature extraction...");
        
        unsigned long start_time = millis();
        unsigned long sample_interval = 1000 / IMU_SAMPLE_RATE;  // 20ms for 50Hz
        
        while (millis() - start_time < IMU_SAMPLE_DURATION && sample_count < MAX_SAMPLES) {
            unsigned long sample_start = millis();
            
            float magnitude = getAccelMagnitude();
            accel_buffer[sample_count++] = magnitude;
            
            // Wait for next sample
            while (millis() - sample_start < sample_interval) {
                delayMicroseconds(100);
            }
        }
        
        // Calculate features
        features = calculateFeatures();
        
        Serial.printf("[SENSOR] ✅ Extracted features: mean=%.2fg, var=%.3f, peak=%.2fg, freq=%.1fHz\n",
                      features.mean_accel, features.variance, 
                      features.peak_accel, features.dominant_freq);
        
        return features;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CALCULATE FEATURES FROM BUFFER
    // ───────────────────────────────────────────────────────────────────────
    
private:
    IMUFeatures calculateFeatures() {
        IMUFeatures f = {0};
        
        if (sample_count == 0) return f;
        
        // Mean and Peak
        float sum = 0;
        f.peak_accel = 0;
        for (int i = 0; i < sample_count; i++) {
            sum += accel_buffer[i];
            if (accel_buffer[i] > f.peak_accel) {
                f.peak_accel = accel_buffer[i];
            }
        }
        f.mean_accel = sum / sample_count;
        
        // Variance
        float variance_sum = 0;
        for (int i = 0; i < sample_count; i++) {
            float diff = accel_buffer[i] - f.mean_accel;
            variance_sum += diff * diff;
        }
        f.variance = variance_sum / sample_count;
        
        // Dominant Frequency (simple peak detection)
        f.dominant_freq = estimateDominantFrequency();
        
        // Spectral Energy
        f.spectral_energy = 0;
        for (int i = 0; i < sample_count; i++) {
            f.spectral_energy += accel_buffer[i] * accel_buffer[i];
        }
        f.spectral_energy /= sample_count;
        
        return f;
    }
    
    // Simple frequency estimation using zero-crossing rate
    float estimateDominantFrequency() {
        int zero_crossings = 0;
        float mean = 0;
        
        // Calculate mean
        for (int i = 0; i < sample_count; i++) {
            mean += accel_buffer[i];
        }
        mean /= sample_count;
        
        // Count zero crossings
        for (int i = 1; i < sample_count; i++) {
            if ((accel_buffer[i-1] < mean && accel_buffer[i] >= mean) ||
                (accel_buffer[i-1] >= mean && accel_buffer[i] < mean)) {
                zero_crossings++;
            }
        }
        
        // Frequency = crossings / (2 * duration)
        float duration = IMU_SAMPLE_DURATION / 1000.0;  // seconds
        return zero_crossings / (2.0 * duration);
    }
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // DEBUG
    // ───────────────────────────────────────────────────────────────────────
    
    void printDebug() {
        SensorData data;
        if (readSensorData(data)) {
            Serial.printf("[SENSOR] Accel: %.2f, %.2f, %.2f g | Gyro: %.1f, %.1f, %.1f °/s | Temp: %.1f°C\n",
                          data.accel_x/9.81, data.accel_y/9.81, data.accel_z/9.81,
                          data.gyro_x, data.gyro_y, data.gyro_z,
                          data.temperature);
        }
    }
};

#endif // SENSOR_MANAGER_H
