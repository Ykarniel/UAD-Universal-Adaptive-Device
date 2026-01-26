/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    LORA MANAGER - SX1262 Communication
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles LoRa initialization, packet transmission, and power management
 * Adapted from SmartHelmetClip and assetTracker LoRa implementations
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef LORA_MANAGER_H
#define LORA_MANAGER_H

#include <RadioLib.h>
#include "../include/config.h"
#include "../include/types.h"

class LoRaManager {
private:
    SX1262 radio = new Module(LORA_CS, LORA_IRQ, LORA_RST, LORA_BUSY);
    bool initialized = false;
    int16_t last_rssi = 0;
    float last_snr = 0;
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ───────────────────────────────────────────────────────────────────────
    
    bool begin() {
        Serial.println("[LORA] 🔄 Initializing SX1262...");
        
        int state = radio.begin(
            LORA_FREQUENCY,
            LORA_BANDWIDTH,
            LORA_SPREADING_FACTOR,
            LORA_CODING_RATE,
            LORA_SYNC_WORD,
            LORA_TX_POWER
        );
        
        if (state != RADIOLIB_ERR_NONE) {
            Serial.printf("[LORA] ❌ Failed to initialize (error %d)\n", state);
            return false;
        }
        
        initialized = true;
        Serial.printf("[LORA] ✅ Initialized at %.1f MHz, SF%d, BW%.0f kHz, %d dBm\n",
                      LORA_FREQUENCY, LORA_SPREADING_FACTOR, 
                      LORA_BANDWIDTH, LORA_TX_POWER);
        
        return true;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SEND PACKET (6-byte binary payload)
    // ───────────────────────────────────────────────────────────────────────
    
    bool sendPacket(UAD_Packet &packet) {
        if (!initialized) return false;
        
        // Transmit binary data
        int state = radio.transmit((uint8_t*)&packet, sizeof(UAD_Packet));
        
        if (state == RADIOLIB_ERR_NONE) {
            Serial.printf("[LORA] ✅ TX: ID=%d, CTX=%d, STS=%d, VAL=%d, BATT=%d%%\n",
                          packet.device_id, packet.context_id, packet.status_code,
                          packet.sensor_val, packet.battery_pct);
            return true;
        } else {
            Serial.printf("[LORA] ❌ TX failed (error %d)\n", state);
            return false;
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SEND PACKET (convenience wrapper)
    // ───────────────────────────────────────────────────────────────────────
    
    bool sendPacket(uint8_t device_id, ContextType context, StatusCode status, 
                    uint16_t sensor_val, uint8_t battery_pct) {
        UAD_Packet packet;
        packet.device_id = device_id;
        packet.context_id = (uint8_t)context;
        packet.status_code = (uint8_t)status;
        packet.sensor_val = sensor_val;
        packet.battery_pct = battery_pct;
        
        return sendPacket(packet);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // RECEIVE PACKET (for gateway mode)
    // ───────────────────────────────────────────────────────────────────────
    
    bool receivePacket(UAD_Packet &packet) {
        if (!initialized) return false;
        
        uint8_t buffer[sizeof(UAD_Packet)];
        int state = radio.receive(buffer, sizeof(UAD_Packet));
        
        if (state == RADIOLIB_ERR_NONE) {
            memcpy(&packet, buffer, sizeof(UAD_Packet));
            
            last_rssi = radio.getRSSI();
            last_snr = radio.getSNR();
            
            Serial.printf("[LORA] ✅ RX: ID=%d, CTX=%d, STS=%d, VAL=%d, BATT=%d%% | RSSI=%d dBm, SNR=%.1f dB\n",
                          packet.device_id, packet.context_id, packet.status_code,
                          packet.sensor_val, packet.battery_pct,
                          last_rssi, last_snr);
            
            return true;
        } else if (state == RADIOLIB_ERR_RX_TIMEOUT) {
            // Normal timeout, not an error
            return false;
        } else {
            Serial.printf("[LORA] ❌ RX failed (error %d)\n", state);
            return false;
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // START LISTENING (for gateway mode)
    // ───────────────────────────────────────────────────────────────────────
    
    bool startReceive() {
        if (!initialized) return false;
        
        int state = radio.startReceive();
        if (state == RADIOLIB_ERR_NONE) {
            Serial.println("[LORA] 👂 Started listening...");
            return true;
        } else {
            Serial.printf("[LORA] ❌ Failed to start RX (error %d)\n", state);
            return false;
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // POWER MANAGEMENT
    // ───────────────────────────────────────────────────────────────────────
    
    bool sleep() {
        if (!initialized) return false;
        
        int state = radio.sleep();
        if (state == RADIOLIB_ERR_NONE) {
            Serial.println("[LORA] 😴 Radio sleeping");
            return true;
        } else {
            Serial.printf("[LORA] ❌ Failed to sleep (error %d)\n", state);
            return false;
        }
    }
    
    bool standby() {
        if (!initialized) return false;
        
        int state = radio.standby();
        if (state == RADIOLIB_ERR_NONE) {
            Serial.println("[LORA] ⏸️ Radio standby");
            return true;
        }
        return false;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // ADAPTIVE TX POWER (based on context)
    // ───────────────────────────────────────────────────────────────────────
    
    void setTxPower(int8_t power) {
        if (!initialized) return;
        
        power = constrain(power, 2, 22);  // SX1262 limits
        radio.setOutputPower(power);
        Serial.printf("[LORA] 🔋 TX power set to %d dBm\n", power);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GETTERS
    // ───────────────────────────────────────────────────────────────────────
    
    int16_t getRSSI() { return last_rssi; }
    float getSNR() { return last_snr; }
    bool isInitialized() { return initialized; }
};

#endif // LORA_MANAGER_H
