import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

// UAD BLE Service UUIDs
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const TX_CHARACTERISTIC = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';  // Device → Phone
const RX_CHARACTERISTIC = 'beb5483e-36e1-4688-b7f5-ea07361b26a9';  // Phone → Device

class BLEService {
    constructor() {
        this.device = null;
        this.isConnected = false;
        this.onDataCallback = null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZE BLE
    // ═══════════════════════════════════════════════════════════════════════

    async initialize() {
        if (!Capacitor.isNativePlatform()) {
            console.warn('[BLE] Running in browser - BLE not available');
            return false;
        }

        try {
            await BleClient.initialize();
            console.log('[BLE] ✅ Initialized');
            return true;
        } catch (error) {
            console.error('[BLE] Failed to initialize:', error);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCAN & CONNECT
    // ═══════════════════════════════════════════════════════════════════════

    async scanAndConnect() {
        try {
            console.log('[BLE] 🔍 Scanning for UAD devices...');

            const device = await BleClient.requestDevice({
                services: [SERVICE_UUID],
                namePrefix: 'UAD'
            });

            console.log('[BLE] Found device:', device.name);

            await BleClient.connect(device.deviceId, (deviceId) => {
                console.log('[BLE] ❌ Disconnected from', deviceId);
                this.isConnected = false;
            });

            this.device = device;
            this.isConnected = true;

            console.log('[BLE] ✅ Connected to', device.name);

            // Start listening for telemetry
            await this.startNotifications();

            return device;
        } catch (error) {
            console.error('[BLE] Connection failed:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LISTEN FOR DATA
    // ═══════════════════════════════════════════════════════════════════════

    async startNotifications() {
        if (!this.device) return;

        try {
            await BleClient.startNotifications(
                this.device.deviceId,
                SERVICE_UUID,
                TX_CHARACTERISTIC,
                (value) => {
                    const text = new TextDecoder().decode(value);
                    console.log('[BLE] ⬇️ Received:', text);

                    try {
                        const data = JSON.parse(text);
                        if (this.onDataCallback) {
                            this.onDataCallback(data);
                        }
                    } catch (e) {
                        console.error('[BLE] Failed to parse data:', e);
                    }
                }
            );

            console.log('[BLE] 👂 Listening for telemetry...');
        } catch (error) {
            console.error('[BLE] Failed to start notifications:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SEND COMMANDS
    // ═══════════════════════════════════════════════════════════════════════

    async sendCommand(data) {
        if (!this.device || !this.isConnected) {
            console.error('[BLE] Not connected');
            return false;
        }

        try {
            const json = JSON.stringify(data);
            const encoder = new TextEncoder();
            const bytes = encoder.encode(json);

            await BleClient.write(
                this.device.deviceId,
                SERVICE_UUID,
                RX_CHARACTERISTIC,
                bytes
            );

            console.log('[BLE] ⬆️ Sent:', json);
            return true;
        } catch (error) {
            console.error('[BLE] Failed to send:', error);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONTROL COMMANDS
    // ═══════════════════════════════════════════════════════════════════════

    async requestAIAnalysis() {
        return this.sendCommand({ type: 'ai_analysis' });
    }

    async forceContextSwitch(contextType) {
        return this.sendCommand({
            type: 'force_context',
            context: contextType
        });
    }

    async triggerOTAUpdate(deviceType) {
        return this.sendCommand({
            type: 'ota_update',
            device_type: deviceType
        });
    }

    async calibrateSensors() {
        return this.sendCommand({ type: 'calibrate' });
    }

    async configureDevice(config) {
        return this.sendCommand({
            type: 'configure',
            config: config
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DISCONNECT
    // ═══════════════════════════════════════════════════════════════════════

    async disconnect() {
        if (this.device) {
            try {
                await BleClient.disconnect(this.device.deviceId);
                console.log('[BLE] 👋 Disconnected');
            } catch (error) {
                console.error('[BLE] Disconnect error:', error);
            }
            this.device = null;
            this.isConnected = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CALLBACKS
    // ═══════════════════════════════════════════════════════════════════════

    onData(callback) {
        this.onDataCallback = callback;
    }
}

export default new BLEService();
