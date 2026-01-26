/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    PATTERN CONFIDENCE CALCULATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Dynamically calculates confidence scores based on sensor data quality
 * Uses multiple metrics to determine pattern match strength
 * 
 * NO HARDCODED CONFIDENCE VALUES!
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef PATTERN_CONFIDENCE_H
#define PATTERN_CONFIDENCE_H

#include <Arduino.h>
#include "../include/types.h"

class PatternConfidence {
public:
  // ───────────────────────────────────────────────────────────────────────
  // CALCULATE CONFIDENCE FROM SENSOR PATTERNS
  // ───────────────────────────────────────────────────────────────────────
  
  static float calculateConfidence(IMUFeatures* history, int size, String pattern_type) {
    if (size < 10) return 0.0;  // Not enough data
    
    float confidence = 0.0;
    
    // Different metrics based on pattern type
    if (pattern_type == "rhythmic") {
      confidence = calculateRhythmicConfidence(history, size);
    } 
    else if (pattern_type == "high_frequency") {
      confidence = calculateFrequencyConfidence(history, size);
    }
    else if (pattern_type == "stationary") {
      confidence = calculateStationaryConfidence(history, size);
    }
    else if (pattern_type == "impact") {
      confidence = calculateImpactConfidence(history, size);
    }
    else {
      // Generic confidence based on data quality
      confidence = calculateGenericConfidence(history, size);
    }
    
    return constrain(confidence, 0.0, 1.0);
  }
  
private:
  // ───────────────────────────────────────────────────────────────────────
  // RHYTHMIC PATTERN CONFIDENCE (walking, pedaling, reps)
  // ───────────────────────────────────────────────────────────────────────
  
  static float calculateRhythmicConfidence(IMUFeatures* history, int size) {
    // Check frequency consistency
    float freq_mean = 0;
    float freq_variance = 0;
    
    for (int i = 0; i < size; i++) {
      freq_mean += history[i].dominant_freq;
    }
    freq_mean /= size;
    
    for (int i = 0; i < size; i++) {
      float diff = history[i].dominant_freq - freq_mean;
      freq_variance += diff * diff;
    }
    freq_variance /= size;
    
    // Low frequency variance = more rhythmic = higher confidence
    float consistency = 1.0 - constrain(freq_variance, 0, 1.0);
    
    // Check if frequency is in expected range (1-3 Hz for most rhythmic activities)
    float freq_validity = 0.0;
    if (freq_mean >= 1.0 && freq_mean <= 3.0) {
      freq_validity = 1.0;
    } else if (freq_mean >= 0.5 && freq_mean <= 5.0) {
      freq_validity = 0.5;  // Plausible but not ideal
    }
    
    // Check periodicity (how many samples show the pattern)
    int periodic_count = 0;
    for (int i = 0; i < size; i++) {
      if (history[i].dominant_freq >= 1.0 && history[i].dominant_freq <= 3.0) {
        periodic_count++;
      }
    }
    float periodicity = (float)periodic_count / size;
    
    // Combine metrics
    return (consistency * 0.4 + freq_validity * 0.3 + periodicity * 0.3);
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // HIGH-FREQUENCY PATTERN CONFIDENCE (machinery, music, engines)
  // ───────────────────────────────────────────────────────────────────────
  
  static float calculateFrequencyConfidence(IMUFeatures* history, int size) {
    // Check frequency stability
    float freq_mean = 0;
    int high_freq_count = 0;
    
    for (int i = 0; i < size; i++) {
      freq_mean += history[i].dominant_freq;
      if (history[i].dominant_freq > 50.0) {
        high_freq_count++;
      }
    }
    freq_mean /= size;
    
    // Percentage of samples showing high frequency
    float freq_prevalence = (float)high_freq_count / size;
    
    // Check spectral energy (high-frequency patterns should have high energy)
    float energy_mean = 0;
    for (int i = 0; i < size; i++) {
      energy_mean += history[i].spectral_energy;
    }
    energy_mean /= size;
    
    float energy_score = constrain(energy_mean / 50.0, 0, 1.0);  // Normalize
    
    // Combine metrics
    return (freq_prevalence * 0.6 + energy_score * 0.4);
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // STATIONARY PATTERN CONFIDENCE (asset tracking)
  // ───────────────────────────────────────────────────────────────────────
  
  static float calculateStationaryConfidence(IMUFeatures* history, int size) {
    // Calculate average variance
    float avg_variance = 0;
    for (int i = 0; i < size; i++) {
      avg_variance += history[i].variance;
    }
    avg_variance /= size;
    
    // Very low variance = high confidence of stationary
    float variance_score = 1.0 - constrain(avg_variance / 0.1, 0, 1.0);
    
    // Check peak acceleration consistency (should be near 1G)
    float peak_deviation = 0;
    for (int i = 0; i < size; i++) {
      peak_deviation += abs(history[i].peak_accel - 1.0);
    }
    peak_deviation /= size;
    
    float peak_score = 1.0 - constrain(peak_deviation, 0, 1.0);
    
    // Combine metrics
    return (variance_score * 0.7 + peak_score * 0.3);
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // IMPACT PATTERN CONFIDENCE (falls, crashes, bumps)
  // ───────────────────────────────────────────────────────────────────────
  
  static float calculateImpactConfidence(IMUFeatures* history, int size) {
    // Find the highest peak
    float max_peak = 0;
    for (int i = 0; i < size; i++) {
      if (history[i].peak_accel > max_peak) {
        max_peak = history[i].peak_accel;
      }
    }
    
    // Higher peak = more confident it's an impact
    float peak_score = constrain((max_peak - 3.0) / 5.0, 0, 1.0);
    
    // Check for sudden variance spike (impact signature)
    float max_variance = 0;
    for (int i = 0; i < size; i++) {
      if (history[i].variance > max_variance) {
        max_variance = history[i].variance;
      }
    }
    
    float variance_score = constrain(max_variance / 10.0, 0, 1.0);
    
    // Combine metrics
    return (peak_score * 0.6 + variance_score * 0.4);
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // GENERIC CONFIDENCE (data quality)
  // ───────────────────────────────────────────────────────────────────────
  
  static float calculateGenericConfidence(IMUFeatures* history, int size) {
    // Check data completeness (no NaN, no zeros)
    int valid_samples = 0;
    for (int i = 0; i < size; i++) {
      if (!isnan(history[i].mean_accel) && 
          !isnan(history[i].variance) &&
          history[i].mean_accel > 0) {
        valid_samples++;
      }
    }
    
    float completeness = (float)valid_samples / size;
    
    // Check data variability (not all identical - indicates sensor working)
    bool has_variation = false;
    for (int i = 1; i < size; i++) {
      if (abs(history[i].mean_accel - history[i-1].mean_accel) > 0.01) {
        has_variation = true;
        break;
      }
    }
    
    float variation_score = has_variation ? 1.0 : 0.0;
    
    return (completeness * 0.7 + variation_score * 0.3);
  }
};

#endif // PATTERN_CONFIDENCE_H
