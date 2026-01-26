/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    CONTEXT CLASSIFIER - AI-Powered Detection
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Uses IMU features + sound DSP to classify device context
 * Falls back to Gemini API for unknown patterns
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include "../include/config.h"
#include "../include/types.h"
#include "pattern_confidence.h"
#include "adaptive_learning.h"

class ContextClassifier {
private:
    ContextType currentContext = CTX_UNKNOWN;
    float confidenceScore = 0.0;
    
    // Learning system
    AdaptiveLearning learning;
    
    // Pattern history for confidence calculation
    IMUFeatures feature_history[100];
    int history_index = 0;
    
public:
    void begin() {
        learning.begin();
        Serial.println("[CONTEXT] 🧠 Context classifier with adaptive learning initialized");
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CLASSIFY CONTEXT (with dynamic confidence)
    // ───────────────────────────────────────────────────────────────────────
    
    ContextType classifyContext(IMUFeatures features) {
        // Store in history
        feature_history[history_index++] = features;
        if (history_index >= 100) history_index = 0;
        
        Serial.println("[CONTEXT] 🔍 Analyzing IMU features...");
        
        int samples_count = min(history_index, 100);
        
        // ═══════════════════════════════════════════════════════════════════
        // IMPACT PATTERN: High peak acceleration
        // ═══════════════════════════════════════════════════════════════════
        if (features.peak_accel > 4.0) {
            confidenceScore = PatternConfidence::calculateConfidence(
                feature_history, samples_count, "impact"
            );
            
            Serial.printf("[CONTEXT] ✅ IMPACT detected (peak: %.2fg, confidence: %.0f%%)\n", 
                         features.peak_accel, confidenceScore * 100);
            
            currentContext = CTX_HELMET;
            learning.recordSuccess("impact_detection", features, confidenceScore);
            return CTX_HELMET;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // RHYTHMIC PATTERN: Periodic motion (1-2.5Hz)
        // ═══════════════════════════════════════════════════════════════════
        if (features.dominant_freq >= 1.0 && features.dominant_freq <= 2.5 &&
            features.variance >= 0.3 && features.variance <= 1.5) {
            
            confidenceScore = PatternConfidence::calculateConfidence(
                feature_history, samples_count, "rhythmic"
            );
            
            Serial.printf("[CONTEXT] ✅ RHYTHMIC pattern (freq: %.1fHz, variance: %.3f, confidence: %.0f%%)\n", 
                         features.dominant_freq, features.variance, confidenceScore * 100);
            
            currentContext = CTX_BICYCLE;
            learning.recordSuccess("rhythmic_motion", features, confidenceScore);
            return CTX_BICYCLE;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // STATIONARY PATTERN: Very low variance
        // ═══════════════════════════════════════════════════════════════════
        if (features.variance < 0.05 && features.peak_accel < 1.5) {
            confidenceScore = PatternConfidence::calculateConfidence(
                feature_history, samples_count, "stationary"
            );
            
            Serial.printf("[CONTEXT] ✅ STATIONARY detected (variance: %.3f, confidence: %.0f%%)\n", 
                         features.variance, confidenceScore * 100);
            
            currentContext = CTX_ASSET;
            learning.recordSuccess("stationary", features, confidenceScore);
            return CTX_ASSET;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // HIGH-FREQUENCY PATTERN: Machinery/engine vibration
        // ═══════════════════════════════════════════════════════════════════
        if (features.dominant_freq > 50.0) {
            confidenceScore = PatternConfidence::calculateConfidence(
                feature_history, samples_count, "high_frequency"
            );
            
            Serial.printf("[CONTEXT] ✅ HIGH-FREQUENCY detected (freq: %.1fHz, confidence: %.0f%%)\n", 
                         features.dominant_freq, confidenceScore * 100);
            
            currentContext = CTX_VEHICLE;
            learning.recordSuccess("high_frequency", features, confidenceScore);
            return CTX_VEHICLE;
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // UNKNOWN: Need AI analysis
        // ═══════════════════════════════════════════════════════════════════
        Serial.println("[CONTEXT] ❓ UNKNOWN pattern - recommend cloud AI analysis");
        currentContext = CTX_UNKNOWN;
        confidenceScore = 0.0;
        return CTX_UNKNOWN;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // ENHANCED CLASSIFICATION (with sound DSP - future)
    // ───────────────────────────────────────────────────────────────────────
    
    ContextType classifyWithSound(IMUFeatures imu_features, float* audio_fft, int fft_size) {
        // TODO: Implement sound DSP classification
        // Analyze audio FFT for:
        // - Construction site noise (hammering, drilling)
        // - Engine sounds (vehicle)
        // - Bicycle bell, chain noise
        // - Human voice patterns
        
        Serial.println("[CONTEXT] 🔊 Sound DSP analysis (future feature)");
        return classifyContext(imu_features);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GETTERS
    // ───────────────────────────────────────────────────────────────────────
    
    ContextType getCurrentContext() {
        return currentContext;
    }
    
    float getConfidence() {
        return confidenceScore;
    }
    
    const char* getContextName() {
        switch (currentContext) {
            case CTX_HELMET:   return "HELMET";
            case CTX_BICYCLE:  return "BICYCLE";
            case CTX_ASSET:    return "ASSET";
            case CTX_VEHICLE:  return "VEHICLE";
            default:           return "UNKNOWN";
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SUGGEST SENSORS (AI-powered recommendations)
    // ───────────────────────────────────────────────────────────────────────
    
    void suggestAdditionalSensors() {
        Serial.println("\n[CONTEXT] 💡 Suggested sensors for better classification:");
        Serial.println("  📍 GPS: Speed, location patterns (bike vs car)");
        Serial.println("  🎤 Microphone: Sound DSP (construction, engine, speech)");
        Serial.println("  💡 Light sensor: Indoor/outdoor, day/night patterns");
        Serial.println("  🌡️ Barometer: Altitude changes (stairs, elevator, mountain bike)");
        Serial.println("  🧲 Magnetometer: Heading, rotation patterns");
        Serial.println("  ⚡ Current sensor: Detect if attached to powered equipment\n");
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DEBUG
    // ───────────────────────────────────────────────────────────────────────
    
    void printDebug(IMUFeatures features) {
        Serial.println("\n╔══════════════════════════════════════════════════════════╗");
        Serial.println("║           CONTEXT CLASSIFICATION ANALYSIS                ║");
        Serial.println("╚══════════════════════════════════════════════════════════╝");
        Serial.printf("  Mean Accel:      %.3f g\n", features.mean_accel);
        Serial.printf("  Variance:        %.3f\n", features.variance);
        Serial.printf("  Peak Accel:      %.2f g\n", features.peak_accel);
        Serial.printf("  Dominant Freq:   %.1f Hz\n", features.dominant_freq);
        Serial.printf("  Spectral Energy: %.2f\n", features.spectral_energy);
        Serial.println("──────────────────────────────────────────────────────────");
        Serial.printf("  🎯 RESULT:       %s (%.0f%% confidence)\n\n", 
                      getContextName(), confidenceScore * 100);
    }
};
