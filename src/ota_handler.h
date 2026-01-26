/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    OTA HANDLER - Over-The-Air Updates
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Downloads and installs AI-generated modules
 * Supports incremental updates (modules only, not full firmware)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef OTA_HANDLER_H
#define OTA_HANDLER_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>

class OTAHandler {
private:
    String backend_url = "http://your-backend.com";  // TODO: Configure
    bool update_in_progress = false;
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // CHECK FOR UPDATES
    // ───────────────────────────────────────────────────────────────────────
    
    bool checkForUpdate(String device_type) {
        if (!WiFi.isConnected()) {
            Serial.println("[OTA] ❌ WiFi not connected");
            return false;
        }
        
        Serial.printf("[OTA] 🔍 Checking for %s module update...\n", device_type.c_str());
        
        HTTPClient http;
        String url = backend_url + "/api/modules/check?device_type=" + device_type;
        http.begin(url);
        
        int httpCode = http.GET();
        
        if (httpCode == 200) {
            String response = http.getString();
            StaticJsonDocument<512> doc;
            deserializeJson(doc, response);
            
            bool update_available = doc["update_available"];
            String version = doc["version"].as<String>();
            
            if (update_available) {
                Serial.printf("[OTA] ✅ Update available: %s v%s\n", 
                             device_type.c_str(), version.c_str());
                http.end();
                return true;
            } else {
                Serial.println("[OTA] ✓ No updates available");
            }
        } else {
            Serial.printf("[OTA] ❌ Check failed (HTTP %d)\n", httpCode);
        }
        
        http.end();
        return false;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DOWNLOAD & INSTALL MODULE
    // ───────────────────────────────────────────────────────────────────────
    
    bool downloadAndInstallModule(String device_type) {
        if (!WiFi.isConnected()) {
            Serial.println("[OTA] ❌ WiFi not connected");
            return false;
        }
        
        Serial.printf("[OTA] 📥 Downloading %s module...\n", device_type.c_str());
        update_in_progress = true;
        
        HTTPClient http;
        String url = backend_url + "/api/modules/download?device_type=" + device_type;
        http.begin(url);
        
        int httpCode = http.GET();
        
        if (httpCode == 200) {
            int contentLength = http.getSize();
            Serial.printf("[OTA] 📦 Module size: %d bytes\n", contentLength);
            
            // Get update stream
            WiFiClient* stream = http.getStreamPtr();
            
            // Begin update
            if (!Update.begin(contentLength)) {
                Serial.println("[OTA] ❌ Not enough space for update");
                http.end();
                update_in_progress = false;
                return false;
            }
            
            // Write update with progress
            size_t written = 0;
            uint8_t buffer[128];
            int lastProgress = 0;
            
            while (http.connected() && (written < contentLength)) {
                size_t available = stream->available();
                
                if (available) {
                    int bytesRead = stream->readBytes(buffer, 
                                    min(sizeof(buffer), available));
                    written += Update.write(buffer, bytesRead);
                    
                    int progress = (written * 100) / contentLength;
                    if (progress != lastProgress && progress % 10 == 0) {
                        Serial.printf("[OTA] 📊 Progress: %d%%\n", progress);
                        lastProgress = progress;
                    }
                }
                
                delay(1);
            }
            
            // Finalize update
            if (Update.end()) {
                if (Update.isFinished()) {
                    Serial.println("[OTA] ✅ Update successful!");
                    http.end();
                    update_in_progress = false;
                    
                    // Reboot in 3 seconds
                    Serial.println("[OTA] 🔄 Rebooting in 3 seconds...");
                    delay(3000);
                    ESP.restart();
                    
                    return true;
                } else {
                    Serial.println("[OTA] ❌ Update not finished");
                }
            } else {
                Serial.printf("[OTA] ❌ Update failed: %s\n", 
                             Update.errorString());
            }
        } else {
            Serial.printf("[OTA] ❌ Download failed (HTTP %d)\n", httpCode);
        }
        
        http.end();
        update_in_progress = false;
        return false;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // REQUEST MODULE GENERATION (triggers backend AI)
    // ───────────────────────────────────────────────────────────────────────
    
    bool requestModuleGeneration(String device_type, String features_json) {
        if (!WiFi.isConnected()) {
            Serial.println("[OTA] ❌ WiFi not connected");
            return false;
        }
        
        Serial.printf("[OTA] 🤖 Requesting AI generation for %s...\n", device_type.c_str());
        
        HTTPClient http;
        String url = backend_url + "/api/modules/generate";
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        
        // Build request
        StaticJsonDocument<1024> doc;
        doc["device_type"] = device_type;
        
        // Parse features
        StaticJsonDocument<512> featuresDoc;
        deserializeJson(featuresDoc, features_json);
        doc["features"] = featuresDoc;
        
        String payload;
        serializeJson(doc, payload);
        
        int httpCode = http.POST(payload);
        
        if (httpCode == 200) {
            String response = http.getString();
            StaticJsonDocument<256> respDoc;
            deserializeJson(respDoc, response);
            
            bool success = respDoc["success"];
            String job_id = respDoc["job_id"].as<String>();
            
            if (success) {
                Serial.printf("[OTA] ✅ Generation started (Job: %s)\n", job_id.c_str());
                Serial.println("[OTA] ⏳ Compiling module... (this may take 60-120s)");
                http.end();
                return true;
            }
        } else {
            Serial.printf("[OTA] ❌ Request failed (HTTP %d)\n", httpCode);
        }
        
        http.end();
        return false;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // POLL GENERATION STATUS
    // ───────────────────────────────────────────────────────────────────────
    
    bool pollGenerationStatus(String job_id) {
        HTTPClient http;
        String url = backend_url + "/api/modules/status?job_id=" + job_id;
        http.begin(url);
        
        int httpCode = http.GET();
        
        if (httpCode == 200) {
            String response = http.getString();
            StaticJsonDocument<256> doc;
            deserializeJson(doc, response);
            
            String status = doc["status"].as<String>();
            
            if (status == "completed") {
                Serial.println("[OTA] ✅ Module ready for download!");
                http.end();
                return true;
            } else if (status == "failed") {
                String error = doc["error"].as<String>();
                Serial.printf("[OTA] ❌ Generation failed: %s\n", error.c_str());
                http.end();
                return false;
            } else {
                Serial.printf("[OTA] ⏳ Status: %s\n", status.c_str());
            }
        }
        
        http.end();
        return false;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GETTERS
    // ───────────────────────────────────────────────────────────────────────
    
    bool isUpdateInProgress() {
        return update_in_progress;
    }
    
    void setBackendURL(String url) {
        backend_url = url;
    }
};

#endif // OTA_HANDLER_H
