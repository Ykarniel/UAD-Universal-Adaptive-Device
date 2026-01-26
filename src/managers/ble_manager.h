/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    BLE MANAGER - Phone Connection
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Connects UAD to smartphone via Bluetooth Low Energy
 * Phone acts as internet gateway for AI features
 * LoRa used only for UAD-to-UAD mesh communication
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef BLE_MANAGER_H
#define BLE_MANAGER_H

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// UUIDs for UAD BLE Service
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID_TX "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // Device → Phone
#define CHARACTERISTIC_UUID_RX "beb5483e-36e1-4688-b7f5-ea07361b26a9"  // Phone → Device

class BLEManager {
private:
    BLEServer* pServer = nullptr;
    BLECharacteristic* pTxCharacteristic = nullptr;
    BLECharacteristic* pRxCharacteristic = nullptr;
    
    bool deviceConnected = false;
    bool oldDeviceConnected = false;
    
    // Callbacks
    void (*onDataReceived)(String data) = nullptr;
    
    // Server callbacks
    class ServerCallbacks: public BLEServerCallbacks {
        BLEManager* manager;
    public:
        ServerCallbacks(BLEManager* mgr) : manager(mgr) {}
        
        void onConnect(BLEServer* pServer) {
            manager->deviceConnected = true;
            Serial.println("[BLE] 📱 Phone connected!");
        }
        
        void onDisconnect(BLEServer* pServer) {
            manager->deviceConnected = false;
            Serial.println("[BLE] 📱 Phone disconnected");
        }
    };
    
    // Characteristic callbacks (receive data from phone)
    class CharacteristicCallbacks: public BLECharacteristicCallbacks {
        BLEManager* manager;
    public:
        CharacteristicCallbacks(BLEManager* mgr) : manager(mgr) {}
        
        void onWrite(BLECharacteristic* pCharacteristic) {
            std::string value = pCharacteristic->getValue();
            if (value.length() > 0) {
                String data = String(value.c_str());
                Serial.printf("[BLE] ⬇️ Received: %s\n", data.c_str());
                
                if (manager->onDataReceived) {
                    manager->onDataReceived(data);
                }
            }
        }
    };
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ───────────────────────────────────────────────────────────────────────
    
    bool begin(String deviceName = "UAD-Device") {
        Serial.println("[BLE] 🔷 Initializing Bluetooth...");
        
        // Initialize BLE
        BLEDevice::init(deviceName.c_str());
        
        // Create BLE Server
        pServer = BLEDevice::createServer();
        pServer->setCallbacks(new ServerCallbacks(this));
        
        // Create BLE Service
        BLEService* pService = pServer->createService(SERVICE_UUID);
        
        // Create TX Characteristic (Device → Phone)
        pTxCharacteristic = pService->createCharacteristic(
            CHARACTERISTIC_UUID_TX,
            BLECharacteristic::PROPERTY_NOTIFY
        );
        pTxCharacteristic->addDescriptor(new BLE2902());
        
        // Create RX Characteristic (Phone → Device)
        pRxCharacteristic = pService->createCharacteristic(
            CHARACTERISTIC_UUID_RX,
            BLECharacteristic::PROPERTY_WRITE
        );
        pRxCharacteristic->setCallbacks(new CharacteristicCallbacks(this));
        
        // Start service
        pService->start();
        
        // Start advertising
        BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
        pAdvertising->addServiceUUID(SERVICE_UUID);
        pAdvertising->setScanResponse(true);
        pAdvertising->setMinPreferred(0x06);
        pAdvertising->setMinPreferred(0x12);
        BLEDevice::startAdvertising();
        
        Serial.printf("[BLE] ✅ Advertising as '%s'\n", deviceName.c_str());
        Serial.println("[BLE] 📱 Waiting for phone connection...");
        
        return true;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SEND DATA TO PHONE
    // ───────────────────────────────────────────────────────────────────────
    
    bool sendToPhone(String data) {
        if (!deviceConnected) {
            Serial.println("[BLE] ❌ Phone not connected");
            return false;
        }
        
        pTxCharacteristic->setValue(data.c_str());
        pTxCharacteristic->notify();
        
        Serial.printf("[BLE] ⬆️ Sent to phone: %s\n", data.c_str());
        return true;
    }
    
    // Send telemetry packet to phone (JSON format)
    bool sendTelemetry(uint8_t context_id, uint8_t status, uint16_t sensor_val, uint8_t battery) {
        String json = "{\"context\":" + String(context_id) + 
                     ",\"status\":" + String(status) +
                     ",\"value\":" + String(sensor_val) +
                     ",\"battery\":" + String(battery) + "}";
        
        return sendToPhone(json);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // REQUEST CLOUD API VIA PHONE
    // ───────────────────────────────────────────────────────────────────────
    
    bool requestAIAnalysis(String imu_features_json) {
        if (!deviceConnected) return false;
        
        String request = "{\"type\":\"ai_analysis\",\"data\":" + imu_features_json + "}";
        return sendToPhone(request);
    }
    
    bool requestModuleGeneration(String device_type, String features_json) {
        if (!deviceConnected) return false;
        
        String request = "{\"type\":\"generate_module\",\"device_type\":\"" + 
                        device_type + "\",\"features\":" + features_json + "}";
        return sendToPhone(request);
    }
    
    bool requestWidgetGeneration(String device_type, String fields_json) {
        if (!deviceConnected) return false;
        
        String request = "{\"type\":\"generate_widget\",\"device_type\":\"" + 
                        device_type + "\",\"fields\":" + fields_json + "}";
        return sendToPhone(request);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SET CALLBACKS
    // ───────────────────────────────────────────────────────────────────────
    
    void setDataCallback(void (*callback)(String data)) {
        onDataReceived = callback;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CONNECTION MANAGEMENT
    // ───────────────────────────────────────────────────────────────────────
    
    void update() {
        // Handle connection state changes
        if (!deviceConnected && oldDeviceConnected) {
            delay(500);
            pServer->startAdvertising();
            Serial.println("[BLE] 📡 Restarting advertising...");
            oldDeviceConnected = deviceConnected;
        }
        
        if (deviceConnected && !oldDeviceConnected) {
            oldDeviceConnected = deviceConnected;
        }
    }
    
    bool isConnected() {
        return deviceConnected;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DEBUG
    // ───────────────────────────────────────────────────────────────────────
    
    void printStatus() {
        Serial.printf("[BLE] Status: %s\n", deviceConnected ? "CONNECTED" : "DISCONNECTED");
    }
};

#endif // BLE_MANAGER_H
