import React, { useState, useEffect } from 'react';
import SavedModesManager from '../services/SavedModesManager';
import BLEService from '../services/BLEService';
import { useDevice } from '../contexts/DeviceContext';

const SavedModesPanel = () => {
    const { deviceData, discoveredFeatures } = useDevice();
    const [savedModes, setSavedModes] = useState([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newModeName, setNewModeName] = useState('');
    const [modeNotes, setModeNotes] = useState('');

    // Load saved modes on mount
    useEffect(() => {
        loadSavedModes();
    }, []);

    const loadSavedModes = async () => {
        const modes = await SavedModesManager.getSavedModes();
        setSavedModes(modes);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SAVE CURRENT MODE
    // ═══════════════════════════════════════════════════════════════════════

    const handleSaveMode = async () => {
        if (!newModeName.trim()) {
            alert('Please enter a mode name');
            return;
        }

        const modeData = {
            deviceType: deviceData.contextName,
            contextType: deviceData.contextType,
            discoveredFeatures: discoveredFeatures,
            telemetryFields: Object.keys(deviceData),
            widgets: [], // TODO: Get active widgets
            thresholds: {}, // TODO: Get learned thresholds
            calibration: {}, // TODO: Get calibration data
            notes: modeNotes
        };

        const success = await SavedModesManager.saveMode(newModeName, modeData);

        if (success) {
            alert(`✅ Mode "${newModeName}" saved!`);
            setNewModeName('');
            setModeNotes('');
            setShowSaveDialog(false);
            loadSavedModes();
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // LOAD MODE
    // ═══════════════════════════════════════════════════════════════════════

    const handleLoadMode = async (modeName) => {
        const confirmed = confirm(
            `Load "${modeName}" mode?\n\n` +
            `This will:\n` +
            `• Send configuration to device\n` +
            `• Restore thresholds and calibration\n` +
            `• Load saved features and widgets`
        );

        if (!confirmed) return;

        const success = await SavedModesManager.loadMode(modeName, BLEService);

        if (success) {
            alert(`✅ Mode "${modeName}" loaded!`);
        } else {
            alert(`❌ Failed to load mode`);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // DELETE MODE
    // ═══════════════════════════════════════════════════════════════════════

    const handleDeleteMode = async (modeName) => {
        const confirmed = confirm(`Delete "${modeName}" mode?`);
        if (!confirmed) return;

        const success = await SavedModesManager.deleteMode(modeName);
        if (success) {
            loadSavedModes();
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT/IMPORT
    // ═══════════════════════════════════════════════════════════════════════

    const handleExportMode = async (modeName) => {
        const json = await SavedModesManager.exportMode(modeName);
        if (json) {
            // Copy to clipboard or share
            navigator.clipboard.writeText(json);
            alert(`✅ Mode exported to clipboard!\nShare this JSON with others.`);
        }
    };

    const handleImportMode = async () => {
        const json = prompt('Paste mode JSON:');
        if (!json) return;

        const success = await SavedModesManager.importMode(json);
        if (success) {
            alert('✅ Mode imported!');
            loadSavedModes();
        } else {
            alert('❌ Invalid mode format');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">💾 Saved Modes</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSaveDialog(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        ➕ Save Current
                    </button>
                    <button
                        onClick={handleImportMode}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        📥 Import
                    </button>
                </div>
            </div>

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="glass rounded-lg p-6 border-2 border-blue-500">
                    <h3 className="text-xl font-bold mb-4">Save Current Mode</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Mode name (e.g., 'My Guitar Setup')"
                            value={newModeName}
                            onChange={(e) => setNewModeName(e.target.value)}
                            className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg"
                        />
                        <textarea
                            placeholder="Notes (optional)"
                            value={modeNotes}
                            onChange={(e) => setModeNotes(e.target.value)}
                            className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg h-20"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveMode}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modes List */}
            {savedModes.length === 0 ? (
                <div className="text-center py-12 opacity-60">
                    <p className="text-lg">No saved modes yet</p>
                    <p className="text-sm mt-2">Save your favorite configurations to quickly switch between them!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedModes.map((mode, index) => (
                        <div key={index} className="glass rounded-lg p-4 border border-white/20">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-bold">{mode.name}</h3>
                                    <p className="text-sm opacity-70">{mode.deviceType}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleLoadMode(mode.name)}
                                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                    >
                                        Load
                                    </button>
                                    <button
                                        onClick={() => handleExportMode(mode.name)}
                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                    >
                                        📤
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMode(mode.name)}
                                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            <div className="text-sm space-y-1">
                                <div>📊 Features: {mode.discoveredFeatures?.length || 0}</div>
                                <div>🎨 Widgets: {mode.widgets?.length || 0}</div>
                                <div>📅 Saved: {new Date(mode.timestamp).toLocaleDateString()}</div>
                                {mode.notes && (
                                    <div className="mt-2 p-2 bg-white/5 rounded text-xs opacity-70">
                                        {mode.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedModesPanel;
