/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    ADAPTIVE LEARNING SYSTEM (ניסוי וטעייה)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Trial-and-error learning to improve telemetry accuracy over time
 * Stores what patterns worked, refines calibration continuously
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef ADAPTIVE_LEARNING_H
#define ADAPTIVE_LEARNING_H

#include <Arduino.h>
#include <Preferences.h>
#include "../include/types.h"

struct PatternCalibration {
  String pattern_name;      // e.g., "rhythmic_walking"
  float threshold_min;      // Learned minimum value
  float threshold_max;      // Learned maximum value
  int success_count;        // How many times this worked
  int failure_count;        // How many times it failed
  float confidence_avg;     // Average confidence when successful
};

class AdaptiveLearning {
private:
  Preferences preferences;
  PatternCalibration calibrations[20];
  int calibration_count = 0;
  
public:
  // ───────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ───────────────────────────────────────────────────────────────────────
  
  void begin() {
    preferences.begin("uad-learn", false);
    loadCalibrations();
    
    Serial.println("[LEARN] 🧠 Adaptive learning system initialized");
    Serial.printf("[LEARN] Loaded %d pattern calibrations\n", calibration_count);
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // RECORD SUCCESSFUL PATTERN DETECTION
  // ───────────────────────────────────────────────────────────────────────
  
  void recordSuccess(String pattern_name, IMUFeatures features, float confidence) {
    PatternCalibration* cal = findOrCreateCalibration(pattern_name);
    
    // Update thresholds based on successful detection
    if (cal->success_count == 0) {
      // First success - initialize thresholds
      cal->threshold_min = features.dominant_freq * 0.8;
      cal->threshold_max = features.dominant_freq * 1.2;
    } else {
      // Refine thresholds (expand range slightly if needed)
      if (features.dominant_freq < cal->threshold_min) {
        cal->threshold_min = features.dominant_freq * 0.95;
      }
      if (features.dominant_freq > cal->threshold_max) {
        cal->threshold_max = features.dominant_freq * 1.05;
      }
    }
    
    cal->success_count++;
    cal->confidence_avg = (cal->confidence_avg * (cal->success_count - 1) + confidence) / cal->success_count;
    
    Serial.printf("[LEARN] ✅ Success: %s (confidence: %.2f, count: %d)\n", 
                  pattern_name.c_str(), confidence, cal->success_count);
    
    saveCalibrations();
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // RECORD FAILED PATTERN DETECTION
  // ───────────────────────────────────────────────────────────────────────
  
  void recordFailure(String pattern_name, IMUFeatures features) {
    PatternCalibration* cal = findOrCreateCalibration(pattern_name);
    
    cal->failure_count++;
    
    // Tighten thresholds if too many failures
    if (cal->failure_count > 5 && cal->success_count > 0) {
      cal->threshold_min *= 1.05;  // Reduce range
      cal->threshold_max *= 0.95;
      Serial.printf("[LEARN] ⚠️ Tightening thresholds for %s (failures: %d)\n",
                    pattern_name.c_str(), cal->failure_count);
    }
    
    saveCalibrations();
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // GET LEARNED THRESHOLDS
  // ───────────────────────────────────────────────────────────────────────
  
  bool getLearnedThreshold(String pattern_name, float* min, float* max) {
    for (int i = 0; i < calibration_count; i++) {
      if (calibrations[i].pattern_name == pattern_name) {
        *min = calibrations[i].threshold_min;
        *max = calibrations[i].threshold_max;
        return true;
      }
    }
    return false;  // No learned data yet
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // ADJUST TELEMETRY ACCURACY (trial and error refinement)
  // ───────────────────────────────────────────────────────────────────────
  
  float adjustTelemetryValue(String telemetry_name, float raw_value, float user_feedback) {
    // User feedback: actual measured value
    // Raw value: sensor-calculated value
    
    String key = telemetry_name + "_offset";
    float current_offset = preferences.getFloat(key.c_str(), 0.0);
    
    // Calculate error
    float error = user_feedback - raw_value;
    
    // Update offset using exponential moving average
    float alpha = 0.1;  // Learning rate
    float new_offset = current_offset * (1 - alpha) + error * alpha;
    
    preferences.putFloat(key.c_str(), new_offset);
    
    Serial.printf("[LEARN] 📊 Adjusted %s: offset %.3f → %.3f\n",
                  telemetry_name.c_str(), current_offset, new_offset);
    
    return raw_value + new_offset;
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // GET PATTERN SUCCESS RATE
  // ───────────────────────────────────────────────────────────────────────
  
  float getSuccessRate(String pattern_name) {
    for (int i = 0; i < calibration_count; i++) {
      if (calibrations[i].pattern_name == pattern_name) {
        int total = calibrations[i].success_count + calibrations[i].failure_count;
        if (total == 0) return 0.5;  // No data yet
        return (float)calibrations[i].success_count / total;
      }
    }
    return 0.5;  // Unknown pattern
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // PRINT LEARNING STATISTICS
  // ───────────────────────────────────────────────────────────────────────
  
  void printStats() {
    Serial.println("\n╔══════════════════════════════════════════════════════════╗");
    Serial.println("║           ADAPTIVE LEARNING STATISTICS                  ║");
    Serial.println("╚══════════════════════════════════════════════════════════╝");
    
    for (int i = 0; i < calibration_count; i++) {
      PatternCalibration* cal = &calibrations[i];
      float success_rate = getSuccessRate(cal->pattern_name);
      
      Serial.printf("\n  📊 %s\n", cal->pattern_name.c_str());
      Serial.printf("     Success Rate:  %.1f%% (%d/%d)\n", 
                    success_rate * 100, 
                    cal->success_count,
                    cal->success_count + cal->failure_count);
      Serial.printf("     Avg Confidence: %.2f\n", cal->confidence_avg);
      Serial.printf("     Thresholds:     %.2f - %.2f\n", 
                    cal->threshold_min, cal->threshold_max);
    }
    
    Serial.println("\n──────────────────────────────────────────────────────────\n");
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // RESET LEARNING (start fresh)
  // ───────────────────────────────────────────────────────────────────────
  
  void reset() {
    preferences.clear();
    calibration_count = 0;
    Serial.println("[LEARN] 🗑️ Reset all learning data");
  }
  
private:
  // ───────────────────────────────────────────────────────────────────────
  // FIND OR CREATE CALIBRATION ENTRY
  // ───────────────────────────────────────────────────────────────────────
  
  PatternCalibration* findOrCreateCalibration(String pattern_name) {
    // Try to find existing
    for (int i = 0; i < calibration_count; i++) {
      if (calibrations[i].pattern_name == pattern_name) {
        return &calibrations[i];
      }
    }
    
    // Create new
    if (calibration_count < 20) {
      calibrations[calibration_count].pattern_name = pattern_name;
      calibrations[calibration_count].threshold_min = 0;
      calibrations[calibration_count].threshold_max = 0;
      calibrations[calibration_count].success_count = 0;
      calibrations[calibration_count].failure_count = 0;
      calibrations[calibration_count].confidence_avg = 0;
      return &calibrations[calibration_count++];
    }
    
    return &calibrations[0];  // Fallback
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // SAVE/LOAD FROM FLASH
  // ───────────────────────────────────────────────────────────────────────
  
  void saveCalibrations() {
    preferences.putInt("cal_count", calibration_count);
    
    for (int i = 0; i < calibration_count; i++) {
      String prefix = "cal_" + String(i) + "_";
      preferences.putString((prefix + "name").c_str(), calibrations[i].pattern_name);
      preferences.putFloat((prefix + "min").c_str(), calibrations[i].threshold_min);
      preferences.putFloat((prefix + "max").c_str(), calibrations[i].threshold_max);
      preferences.putInt((prefix + "success").c_str(), calibrations[i].success_count);
      preferences.putInt((prefix + "fail").c_str(), calibrations[i].failure_count);
      preferences.putFloat((prefix + "conf").c_str(), calibrations[i].confidence_avg);
    }
  }
  
  void loadCalibrations() {
    calibration_count = preferences.getInt("cal_count", 0);
    
    for (int i = 0; i < calibration_count; i++) {
      String prefix = "cal_" + String(i) + "_";
      calibrations[i].pattern_name = preferences.getString((prefix + "name").c_str(), "");
      calibrations[i].threshold_min = preferences.getFloat((prefix + "min").c_str(), 0);
      calibrations[i].threshold_max = preferences.getFloat((prefix + "max").c_str(), 0);
      calibrations[i].success_count = preferences.getInt((prefix + "success").c_str(), 0);
      calibrations[i].failure_count = preferences.getInt((prefix + "fail").c_str(), 0);
      calibrations[i].confidence_avg = preferences.getFloat((prefix + "conf").c_str(), 0);
    }
  }
};

#endif // ADAPTIVE_LEARNING_H
