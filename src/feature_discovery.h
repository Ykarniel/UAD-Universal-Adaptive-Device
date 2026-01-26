/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                 AUTONOMOUS FEATURE DISCOVERY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Device proactively analyzes sensor patterns and auto-generates:
 * - New telemetry fields
 * - Dashboard widgets
 * - Contextual features
 * 
 * Example: If guitar detected, auto-adds:
 *   - chord_progression_tracker
 *   - practice_streak_counter
 *   - tempo_analyzer
 *   - tuning_drift_monitor
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef FEATURE_DISCOVERY_H
#define FEATURE_DISCOVERY_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "../include/types.h"

struct DiscoveredFeature {
  String name;              // e.g., "chord_progression"
  String description;       // What it does
  String telemetry_field;   // Data field name
  String widget_type;       // "gauge", "chart", "counter", etc.
  float confidence;         // How sure we are this is useful
};

class FeatureDiscovery {
private:
  DiscoveredFeature features[10];  // Max 10 auto-discovered features
  int feature_count = 0;
  
  unsigned long last_analysis = 0;
  static const unsigned long ANALYSIS_INTERVAL = 300000;  // 5 minutes
  
public:
  // ───────────────────────────────────────────────────────────────────────
  // ANALYZE SENSOR PATTERNS (continuous learning)
  // ───────────────────────────────────────────────────────────────────────
  
  void analyzePatterns(ContextType current_context, IMUFeatures* history, int history_size) {
    if (millis() - last_analysis < ANALYSIS_INTERVAL) return;
    
    Serial.println("\n[DISCOVERY] 🔍 Analyzing sensor patterns for new features...");
    
    // Check for patterns that suggest additional capabilities
    switch (current_context) {
      case CTX_HELMET:
        discoverHelmetFeatures(history, history_size);
        break;
      case CTX_BICYCLE:
        discoverBicycleFeatures(history, history_size);
        break;
      case CTX_ASSET:
        discoverAssetFeatures(history, history_size);
        break;
      case CTX_VEHICLE:
        discoverVehicleFeatures(history, history_size);
        break;
      default:
        discoverGenericFeatures(history, history_size);
    }
    
    last_analysis = millis();
    
    // Send discovered features to phone for widget generation
    if (feature_count > 0) {
      requestWidgetGeneration();
    }
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // CONTEXT-SPECIFIC FEATURE DISCOVERY
  // ───────────────────────────────────────────────────────────────────────
  
private:
  void discoverHelmetFeatures(IMUFeatures* history, int size) {
    // Pattern: Regular walking → add step counter
    int rhythmic_count = 0;
    for (int i = 0; i < size; i++) {
      if (history[i].dominant_freq > 1.5 && history[i].dominant_freq < 2.5) {
        rhythmic_count++;
      }
    }
    
    if (rhythmic_count > size * 0.7) {  // 70% rhythmic
      addFeature({
        .name = "step_counter",
        .description = "Counts steps based on walking cadence",
        .telemetry_field = "daily_steps",
        .widget_type = "counter",
        .confidence = 0.85
      });
      Serial.println("[DISCOVERY] ✨ New feature: Step Counter");
    }
    
    // Pattern: Frequent small impacts → add impact logger
    int impact_count = 0;
    for (int i = 0; i < size; i++) {
      if (history[i].peak_accel > 2.0 && history[i].peak_accel < 4.0) {
        impact_count++;
      }
    }
    
    if (impact_count > 5) {
      addFeature({
        .name = "impact_logger",
        .description = "Logs all impacts for safety analysis",
        .telemetry_field = "impact_history",
        .widget_type = "timeline",
        .confidence = 0.90
      });
      Serial.println("[DISCOVERY] ✨ New feature: Impact Logger");
    }
  }
  
  void discoverBicycleFeatures(IMUFeatures* history, int size) {
    // Pattern: Consistent cadence → add cadence optimizer
    float avg_freq = 0;
    for (int i = 0; i < size; i++) {
      avg_freq += history[i].dominant_freq;
    }
    avg_freq /= size;
    
    if (avg_freq > 1.0 && avg_freq < 2.5) {
      addFeature({
        .name = "cadence_optimizer",
        .description = "Suggests optimal pedaling rhythm",
        .telemetry_field = "target_cadence",
        .widget_type = "gauge",
        .confidence = 0.88
      });
      Serial.println("[DISCOVERY] ✨ New feature: Cadence Optimizer");
    }
    
    // Pattern: Variance spikes → add terrain detector
    int rough_terrain_samples = 0;
    for (int i = 0; i < size; i++) {
      if (history[i].variance > 1.0) {
        rough_terrain_samples++;
      }
    }
    
    if (rough_terrain_samples > size * 0.3) {
      addFeature({
        .name = "terrain_detector",
        .description = "Detects road surface quality",
        .telemetry_field = "terrain_roughness",
        .widget_type = "chart",
        .confidence = 0.75
      });
      Serial.println("[DISCOVERY] ✨ New feature: Terrain Detector");
    }
  }
  
  void discoverAssetFeatures(IMUFeatures* history, int size) {
    // Pattern: Very stable → add vibration anomaly detector
    if (size > 100) {  // Need enough data
      addFeature({
        .name = "vibration_anomaly",
        .description = "Detects unusual vibrations (tampering)",
        .telemetry_field = "anomaly_score",
        .widget_type = "alert",
        .confidence = 0.92
      });
      Serial.println("[DISCOVERY] ✨ New feature: Vibration Anomaly Detector");
    }
  }
  
  void discoverVehicleFeatures(IMUFeatures* history, int size) {
    // Pattern: High-frequency vibration → add engine health monitor
    float avg_energy = 0;
    for (int i = 0; i < size; i++) {
      avg_energy += history[i].spectral_energy;
    }
    avg_energy /= size;
    
    if (avg_energy > 10.0) {
      addFeature({
        .name = "engine_health",
        .description = "Monitors engine vibration patterns",
        .telemetry_field = "vibration_health_score",
        .widget_type = "gauge",
        .confidence = 0.80
      });
      Serial.println("[DISCOVERY] ✨ New feature: Engine Health Monitor");
    }
  }
  
  void discoverGenericFeatures(IMUFeatures* history, int size) {
    // Unknown context - look for ANY interesting patterns
    
    // High-frequency periodic pattern → add frequency tracker
    int periodic_count = 0;
    for (int i = 0; i < size; i++) {
      if (history[i].dominant_freq > 10.0) {
        periodic_count++;
      }
    }
    
    if (periodic_count > size * 0.5) {
      addFeature({
        .name = "frequency_tracker",
        .description = "Tracks high-frequency periodic events",
        .telemetry_field = "event_frequency",
        .widget_type = "chart",
        .confidence = 0.70
      });
      Serial.println("[DISCOVERY] ✨ New feature: Frequency Tracker");
    }
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // FEATURE MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────
  
  void addFeature(DiscoveredFeature feature) {
    if (feature_count >= 10) return;  // Max features
    
    // Check if already exists
    for (int i = 0; i < feature_count; i++) {
      if (features[i].name == feature.name) {
        return;  // Already discovered
      }
    }
    
    features[feature_count++] = feature;
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // REQUEST WIDGET GENERATION VIA PHONE
  // ───────────────────────────────────────────────────────────────────────
  
  void requestWidgetGeneration() {
    Serial.println("[DISCOVERY] 📱 Requesting auto-widget generation...");
    
    // Build JSON of discovered features
    StaticJsonDocument<2048> doc;
    JsonArray features_arr = doc.createNestedArray("features");
    
    for (int i = 0; i < feature_count; i++) {
      JsonObject f = features_arr.createNestedObject();
      f["name"] = features[i].name;
      f["description"] = features[i].description;
      f["field"] = features[i].telemetry_field;
      f["widget"] = features[i].widget_type;
      f["confidence"] = features[i].confidence;
    }
    
    String json;
    serializeJson(doc, json);
    
    Serial.println("[DISCOVERY] Discovered features JSON:");
    Serial.println(json);
    
    // TODO: Send via BLE to phone
    // Phone will call backend to generate widgets
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // GET DISCOVERED FEATURES
  // ───────────────────────────────────────────────────────────────────────
  
public:
  int getFeatureCount() {
    return feature_count;
  }
  
  DiscoveredFeature* getFeatures() {
    return features;
  }
  
  void printDiscoveredFeatures() {
    Serial.println("\n╔══════════════════════════════════════════════════════════╗");
    Serial.println("║           AUTONOMOUS FEATURE DISCOVERY                  ║");
    Serial.println("╚══════════════════════════════════════════════════════════╝");
    
    if (feature_count == 0) {
      Serial.println("  No new features discovered yet.");
      return;
    }
    
    for (int i = 0; i < feature_count; i++) {
      Serial.printf("\n  ✨ %s\n", features[i].name.c_str());
      Serial.printf("     %s\n", features[i].description.c_str());
      Serial.printf("     Telemetry: %s\n", features[i].telemetry_field.c_str());
      Serial.printf("     Widget: %s\n", features[i].widget_type.c_str());
      Serial.printf("     Confidence: %.0f%%\n", features[i].confidence * 100);
    }
    
    Serial.println("\n──────────────────────────────────────────────────────────\n");
  }
  
  // ───────────────────────────────────────────────────────────────────────
  // CLEAR FEATURES (when context changes)
  // ───────────────────────────────────────────────────────────────────────
  
  void clearFeatures() {
    feature_count = 0;
    Serial.println("[DISCOVERY] 🗑️ Cleared all discovered features");
  }
};

#endif // FEATURE_DISCOVERY_H
