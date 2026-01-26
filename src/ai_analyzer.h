/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    AI ANALYZER - Self-Code Writing MVP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sends unknown patterns to Gemini API for analysis
 * Generates widget code dynamically based on context
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef AI_ANALYZER_H
#define AI_ANALYZER_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "../include/config.h"
#include "../include/types.h"

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

#define GEMINI_API_ENDPOINT "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
#define GEMINI_API_KEY      "YOUR_API_KEY_HERE"  // TODO: Set your API key

class AIAnalyzer {
private:
    bool wifi_connected = false;
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // WIFI CONNECTION
    // ───────────────────────────────────────────────────────────────────────
    
    bool connectWiFi(const char* ssid, const char* password) {
        Serial.printf("[AI] 📡 Connecting to WiFi '%s'...\n", ssid);
        
        WiFi.begin(ssid, password);
        
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            Serial.print(".");
            attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            wifi_connected = true;
            Serial.printf("\n[AI] ✅ WiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
            return true;
        } else {
            Serial.println("\n[AI] ❌ WiFi connection failed");
            return false;
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // ANALYZE UNKNOWN CONTEXT (Gemini API)
    // ───────────────────────────────────────────────────────────────────────
    
    String analyzeUnknownContext(IMUFeatures features) {
        if (!wifi_connected) {
            Serial.println("[AI] ❌ WiFi not connected - cannot analyze");
            return "{}";
        }
        
        Serial.println("[AI] 🤖 Sending IMU pattern to Gemini API...");
        
        // Build prompt
        String prompt = buildContextPrompt(features);
        
        // Call Gemini API
        String response = callGeminiAPI(prompt);
        
        return response;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GENERATE WIDGET CODE (Self-Code Writing MVP)
    // ───────────────────────────────────────────────────────────────────────
    
    String generateWidgetCode(ContextType context, const char* data_fields[],int field_count) {
        if (!wifi_connected) {
            Serial.println("[AI] ❌ WiFi not connected - cannot generate code");
            return "";
        }
        
        Serial.printf("[AI] 🎨 Generating React widget for %s context...\n", 
                      getContextName(context));
        
        // Build prompt for widget generation
        String prompt = "Generate a React component for a ";
        prompt += getContextName(context);
        prompt += " dashboard widget.\n\nAvailable data fields: ";
        
        for (int i = 0; i < field_count; i++) {
            prompt += data_fields[i];
            if (i < field_count - 1) prompt += ", ";
        }
        
        prompt += "\n\nRequirements:\n";
        prompt += "- Use Tailwind CSS for styling\n";
        prompt += "- Use Recharts for data visualization if needed\n";
        prompt += "- Make it mobile-responsive\n";
        prompt += "- Follow modern UI/UX best practices\n";
        prompt += "- Return ONLY valid JSX code, no explanation\n";
        
        String widget_code = callGeminiAPI(prompt);
        
        Serial.println("[AI] ✅ Widget code generated!");
        return widget_code;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SUGGEST TELEMETRY FIELDS
    // ───────────────────────────────────────────────────────────────────────
    
    String suggestTelemetry(ContextType context) {
        Serial.printf("[AI] 💡 Suggesting telemetry for %s...\n", getContextName(context));
        
        String prompt = "For a ";
        prompt += getContextName(context);
        prompt += " tracking device, what are the most important telemetry data points to collect? ";
        prompt += "Return a JSON array with field names and descriptions. ";
        prompt += "Example: [{\"field\": \"speed\", \"description\": \"Current speed in km/h\", \"unit\": \"km/h\"}]";
        
        String suggestions = callGeminiAPI(prompt);
        return suggestions;
    }
    
private:
    // ───────────────────────────────────────────────────────────────────────
    // BUILD CONTEXT ANALYSIS PROMPT
    // ───────────────────────────────────────────────────────────────────────
    
    String buildContextPrompt(IMUFeatures features) {
        String prompt = "Analyze this 2-second vibration/motion pattern from an IMU sensor:\n\n";
        prompt += "Mean Acceleration: " + String(features.mean_accel, 3) + " g\n";
        prompt += "Variance: " + String(features.variance, 3) + "\n";
        prompt += "Peak Acceleration: " + String(features.peak_accel, 2) + " g\n";
        prompt += "Dominant Frequency: " + String(features.dominant_freq, 1) + " Hz\n";
        prompt += "Spectral Energy: " + String(features.spectral_energy, 2) + "\n\n";
        
        prompt += "Possible contexts:\n";
        prompt += "- helmet: Worn by a person (walking patterns, potential falls/impacts)\n";
        prompt += "- bicycle: Attached to a bicycle (rhythmic 1-2Hz pedaling motion)\n";
        prompt += "- vehicle: In a car/truck (engine vibration ~50-100Hz)\n";
        prompt += "- machinery: On industrial equipment (high-frequency vibration)\n";
        prompt += "- asset: Stationary object (very low variance)\n\n";
        
        prompt += "Return ONLY a JSON object: {\"context\": \"helmet|bicycle|vehicle|machinery|asset\", \"confidence\": 0-100, \"reasoning\": \"brief explanation\"}";
        
        return prompt;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CALL GEMINI API
    // ───────────────────────────────────────────────────────────────────────
    
    String callGeminiAPI(String prompt) {
        HTTPClient http;
        
        String url = String(GEMINI_API_ENDPOINT) + "?key=" + String(GEMINI_API_KEY);
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        
        // Build JSON payload
        StaticJsonDocument<2048> doc;
        JsonArray contents = doc.createNestedArray("contents");
        JsonObject content = contents.createNestedObject();
        JsonArray parts = content.createNestedArray("parts");
        JsonObject part = parts.createNestedObject();
        part["text"] = prompt;
        
        String payload;
        serializeJson(doc, payload);
        
        // Send request
        int httpCode = http.POST(payload);
        String response = "";
        
        if (httpCode == 200) {
            response = http.getString();
            Serial.println("[AI] ✅ Gemini API call successful");
            
            // Parse response (extract text from candidates[0].content.parts[0].text)
            StaticJsonDocument<4096> respDoc;
            deserializeJson(respDoc, response);
            response = respDoc["candidates"][0]["content"]["parts"][0]["text"].as<String>();
        } else {
            Serial.printf("[AI] ❌ API call failed (HTTP %d)\n", httpCode);
            Serial.println(http.getString());
        }
        
        http.end();
        return response;
    }
    
    const char* getContextName(ContextType ctx) {
        switch (ctx) {
            case CTX_HELMET: return "helmet";
            case CTX_BICYCLE: return "bicycle";
            case CTX_ASSET: return "asset";
            case CTX_VEHICLE: return "vehicle";
            default: return "unknown";
        }
    }
};

#endif // AI_ANALYZER_H
