// Saved Modes Manager for Mobile App
// Allows users to save favorite configurations and switch between them

class SavedModesManager {
    static STORAGE_KEY = '@uad_saved_modes';

    // Helper to simulate async behavior for localStorage
    static async setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error("Storage error", e);
            return false;
        }
    }

    static async getItem(key) {
        return localStorage.getItem(key);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SAVE CURRENT MODE
    // ═══════════════════════════════════════════════════════════════════════

    static async saveMode(modeName, modeData) {
        try {
            const modes = await this.getSavedModes();

            const newMode = {
                name: modeName,
                timestamp: new Date().toISOString(),
                deviceType: modeData.deviceType,
                contextType: modeData.contextType,
                discoveredFeatures: modeData.discoveredFeatures || [],
                telemetryFields: modeData.telemetryFields || [],
                widgets: modeData.widgets || [],
                thresholds: modeData.thresholds || {},
                calibration: modeData.calibration || {},
                notes: modeData.notes || '',
            };

            // Check if mode already exists (by name)
            const existingIndex = modes.findIndex(m => m.name === modeName);

            if (existingIndex >= 0) {
                // Update existing mode
                modes[existingIndex] = newMode;
            } else {
                // Add new mode
                modes.push(newMode);
            }

            await this.setItem(this.STORAGE_KEY, JSON.stringify(modes));

            console.log(`[MODES] ✅ Saved mode: ${modeName}`);
            return true;
        } catch (error) {
            console.error('[MODES] Failed to save mode:', error);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET ALL SAVED MODES
    // ═══════════════════════════════════════════════════════════════════════

    static async getSavedModes() {
        try {
            const modes = await this.getItem(this.STORAGE_KEY);
            return modes ? JSON.parse(modes) : [];
        } catch (error) {
            console.error('[MODES] Failed to get modes:', error);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOAD MODE (APPLY TO DEVICE)
    // ═══════════════════════════════════════════════════════════════════════

    static async loadMode(modeName, bleService) {
        try {
            const modes = await this.getSavedModes();
            const mode = modes.find(m => m.name === modeName);

            if (!mode) {
                console.error(`[MODES] Mode not found: ${modeName}`);
                return false;
            }

            console.log(`[MODES] 🔄 Loading mode: ${modeName}`);

            // Send configuration to device via BLE
            const success = await bleService.sendCommand({
                type: 'load_mode',
                mode_name: modeName,
                device_type: mode.deviceType,
                thresholds: mode.thresholds,
                calibration: mode.calibration,
                features: mode.discoveredFeatures
            });

            if (success) {
                console.log(`[MODES] ✅ Mode loaded: ${modeName}`);
            }

            return success;
        } catch (error) {
            console.error('[MODES] Failed to load mode:', error);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DELETE MODE
    // ═══════════════════════════════════════════════════════════════════════

    static async deleteMode(modeName) {
        try {
            const modes = await this.getSavedModes();
            const filtered = modes.filter(m => m.name !== modeName);

            await this.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

            console.log(`[MODES] 🗑️ Deleted mode: ${modeName}`);
            return true;
        } catch (error) {
            console.error('[MODES] Failed to delete mode:', error);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT MODE (SHARE WITH OTHERS)
    // ═══════════════════════════════════════════════════════════════════════

    static async exportMode(modeName) {
        try {
            const modes = await this.getSavedModes();
            const mode = modes.find(m => m.name === modeName);

            if (!mode) return null;

            // Create shareable JSON
            const exportData = {
                version: '1.0',
                mode: mode,
                exported_at: new Date().toISOString(),
                exported_by: 'UAD App'
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('[MODES] Failed to export mode:', error);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // IMPORT MODE (FROM SHARED JSON)
    // ═══════════════════════════════════════════════════════════════════════

    static async importMode(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.mode || !data.version) {
                throw new Error('Invalid mode format');
            }

            const modes = await this.getSavedModes();

            // Add imported mode
            modes.push(data.mode);

            await this.setItem(this.STORAGE_KEY, JSON.stringify(modes));

            console.log(`[MODES] ✅ Imported mode: ${data.mode.name}`);
            return true;
        } catch (error) {
            console.error('[MODES] Failed to import mode:', error);
            return false;
        }
    }
}

export default SavedModesManager;
