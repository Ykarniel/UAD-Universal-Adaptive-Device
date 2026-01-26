/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    DISPLAY MANAGER - OLED Visuals
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Abstraction layer for 128x64 OLED (SSD1306)
 * Provides high-level methods for graphs, icons, and status
 * 
 * MEMORY USAGE:
 * - Framebuffer: 1024 bytes (1KB)
 * - Fonts/Icons: ~2KB PROGMEM (Flash)
 * - Total RAM overhead: ~1.1KB (Very low)
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "../include/config.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

class DisplayManager {
private:
    Adafruit_SSD1306* oled;
    bool initialized = false;
    
    // Graph history buffer
    static const int GRAPH_WIDTH = 100;
    float graphBuffer[GRAPH_WIDTH];
    int graphIndex = 0;

public:
    void begin() {
        oled = new Adafruit_SSD1306(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RST);
        
        // Heltec V3 specific pins
        Wire.begin(OLED_SDA, OLED_SCL);

        if(!oled->begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
            Serial.println("[DISPLAY] ❌ SSD1306 allocation failed");
            return;
        }

        oled->clearDisplay();
        oled->setTextColor(SSD1306_WHITE);
        oled->setTextSize(1);
        oled->setCursor(0,0);
        oled->println("UAD v" FIRMWARE_VERSION);
        oled->display();
        
        // Init graph buffer
        for(int i=0; i<GRAPH_WIDTH; i++) graphBuffer[i] = 0;
        
        initialized = true;
        Serial.println("[DISPLAY] ✅ OLED Initialized");
    }

    // ───────────────────────────────────────────────────────────────────────
    // 1. WAVEFORM GRAPH (Scrolling)
    // ───────────────────────────────────────────────────────────────────────
    void drawGraph(float value, float minVal, float maxVal) {
        if (!initialized) return;

        // Add new value to buffer
        graphBuffer[graphIndex] = value;
        graphIndex = (graphIndex + 1) % GRAPH_WIDTH;

        oled->clearDisplay();
        
        // Draw Frame
        oled->drawRect(0, 10, 128, 44, SSD1306_WHITE);
        
        // Draw Graph
        for (int i = 0; i < GRAPH_WIDTH - 1; i++) {
            // Unroll ring buffer
            int idx = (graphIndex + i) % GRAPH_WIDTH;
            int nextIdx = (graphIndex + i + 1) % GRAPH_WIDTH;
            
            // Map value to Y pixels (12 to 52)
            int y1 = map(graphBuffer[idx] * 100, minVal * 100, maxVal * 100, 52, 12);
            int y2 = map(graphBuffer[nextIdx] * 100, minVal * 100, maxVal * 100, 52, 12);
            
            // Constrain
            y1 = constrain(y1, 12, 52);
            y2 = constrain(y2, 12, 52);
            
            oled->drawLine(i + 14, y1, i + 15, y2, SSD1306_WHITE);
        }
        
        // Draw Current Value text
        oled->setCursor(0, 0);
        oled->setTextSize(1);
        oled->printf("VAL: %.2f", value);
        
        oled->display();
    }

    // ───────────────────────────────────────────────────────────────────────
    // 2. STATUS SCREEN
    // ───────────────────────────────────────────────────────────────────────
    void showStatus(String title, String status, int iconIndex) {
        if (!initialized) return;
        
        oled->clearDisplay();
        
        // Title Bar
        oled->fillRect(0, 0, 128, 16, SSD1306_WHITE);
        oled->setTextColor(SSD1306_BLACK);
        oled->setCursor(4, 4);
        oled->print(title);
        
        // Status Text (Big)
        oled->setTextColor(SSD1306_WHITE);
        oled->setCursor(0, 30);
        oled->setTextSize(2);
        oled->println(status);
        
        // Icon would go here (simplified as circle for now)
        oled->drawCircle(110, 40, 10, SSD1306_WHITE);
        
        oled->display();
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // 3. PROGRESS BAR
    // ───────────────────────────────────────────────────────────────────────
    void showProgressBar(String label, int percent) {
        if (!initialized) return;
        
        oled->clearDisplay();
        
        oled->setTextSize(1);
        oled->setCursor(0, 20);
        oled->println(label);
        
        // Bar Info
        oled->drawRect(0, 35, 128, 14, SSD1306_WHITE);
        int width = map(percent, 0, 100, 0, 124);
        oled->fillRect(2, 37, width, 10, SSD1306_WHITE);
        
        oled->display();
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // 4. POWER MANAGEMENT (Auto-Dim)
    // ───────────────────────────────────────────────────────────────────────
    
    unsigned long lastActivity = 0;
    bool screenOn = true;
    static const unsigned long SCREEN_TIMEOUT = 10000; // 10s OFF
    
    void wake() {
        lastActivity = millis();
        if (!screenOn) {
            oled->ssd1306_command(SSD1306_DISPLAYON);
            screenOn = true;
            // Serial.println("[DISPLAY] 💡 Waking up");
        }
    }
    
    void checkPowerSave() {
        if (!initialized) return;
        
        if (screenOn && (millis() - lastActivity > SCREEN_TIMEOUT)) {
            oled->ssd1306_command(SSD1306_DISPLAYOFF);
            screenOn = false;
            // Serial.println("[DISPLAY] 🌑 Auto-dimming");
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // 5. OVERLAYS (Battery)
    // ───────────────────────────────────────────────────────────────────────
    
    void drawBatteryOverlay(int percent, bool charging) {
        // Battery Outline (Top Right)
        oled->drawRect(104, 2, 20, 10, SSD1306_WHITE);
        oled->drawRect(124, 4, 2, 6, SSD1306_WHITE);
        
        // Fill
        int width = map(percent, 0, 100, 0, 16);
        oled->fillRect(106, 4, width, 6, SSD1306_WHITE);
        
        // Charging Indicator (Lightning Bolt)
        if (charging) {
            oled->setCursor(96, 2);
            oled->write(0x7F); // roughly a bolt or use '4' in wingdings, here just a char
            // Or better, draw a small line
            oled->drawLine(98, 2, 102, 10, SSD1306_WHITE);
        }
    }

    // Update draw functions to include overlay
    void drawGraph(float value, float minVal, float maxVal, int battPct, bool charging) {
        if (!initialized) return;
        // ... (Graph logic) ... 
        
        // RE-IMPLEMENT GRAPH LOGIC because replace_file_content replaces the block
        // (Fast forward graph logic from previous Step)
        
        // Add new value to buffer
        graphBuffer[graphIndex] = value;
        graphIndex = (graphIndex + 1) % GRAPH_WIDTH;

        oled->clearDisplay();
        
        // Draw Frame
        oled->drawRect(0, 10, 128, 44, SSD1306_WHITE);
        
        // Draw Graph
        for (int i = 0; i < GRAPH_WIDTH - 1; i++) {
            int idx = (graphIndex + i) % GRAPH_WIDTH;
            int nextIdx = (graphIndex + i + 1) % GRAPH_WIDTH;
            int y1 = map(graphBuffer[idx] * 100, minVal * 100, maxVal * 100, 52, 12);
            int y2 = map(graphBuffer[nextIdx] * 100, minVal * 100, maxVal * 100, 52, 12);
            y1 = constrain(y1, 12, 52);
            y2 = constrain(y2, 12, 52);
            oled->drawLine(i + 14, y1, i + 15, y2, SSD1306_WHITE);
        }
        
        oled->setCursor(0, 0);
        oled->setTextSize(1);
        oled->printf("VAL: %.2f", value);
        
        // OVERLAY
        drawBatteryOverlay(battPct, charging);
        
        oled->display();
        resetTimer();
    }
    
    // We update showStatus signature too
    void showStatus(String title, String status, int iconIndex, int battPct, bool charging) {
        if (!initialized) return;
        oled->clearDisplay();
        
        // Title Bar
        oled->fillRect(0, 0, 128, 16, SSD1306_WHITE);
        oled->setTextColor(SSD1306_BLACK);
        oled->setCursor(4, 4);
        oled->print(title);
        
        // Status Text
        oled->setTextColor(SSD1306_WHITE);
        oled->setCursor(0, 30);
        oled->setTextSize(2);
        oled->println(status);
        
        oled->drawCircle(110, 40, 10, SSD1306_WHITE);
        
        // OVERLAY (Inverted color for title bar area? No, draw on top right)
        // Since title bar is white, we need to draw battery in BLACK there
        // Or simply draw it below. Let's draw it in the title bar area in BLACK.
        
        // Battery Outline (Inverted)
        oled->drawRect(104, 2, 20, 10, SSD1306_BLACK);
        oled->drawRect(124, 4, 2, 6, SSD1306_BLACK);
        int width = map(battPct, 0, 100, 0, 16);
        oled->fillRect(106, 4, width, 6, SSD1306_BLACK);
        
        oled->display();
        resetTimer(); 
    }
