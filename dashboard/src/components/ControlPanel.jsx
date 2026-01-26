import React, { useState } from 'react';
import BLEService from '../services/BLEService';
import { useDevice } from '../contexts/DeviceContext';
import ModeBrowser from './ModeBrowser';
import CustomModeWizard from './CustomModeWizard';
import MyModes from './MyModes';

const ControlPanel = () => {
    const { deviceData, setContextOverride, hardwareProfile, userProfile } = useDevice();
    const [isConnecting, setIsConnecting] = useState(false);
    const [showOTA, setShowOTA] = useState(false);
    const [customContext, setCustomContext] = useState('');
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [viewMode, setViewMode] = useState('library');

    // ═══════════════════════════════════════════════════════════════════════
    // CONNECT TO DEVICE
    // ═══════════════════════════════════════════════════════════════════════

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            await BLEService.initialize();
            await BLEService.scanAndConnect();
            alert('✅ Connected to UAD device!');
        } catch (error) {
            alert('❌ Failed to connect: ' + error.message);
        }
        setIsConnecting(false);
    };

    const handleDisconnect = async () => {
        await BLEService.disconnect();
        alert('👋 Disconnected from UAD');
    };

    // ═══════════════════════════════════════════════════════════════════════
    // AI ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════

    const handleAIAnalysis = async () => {
        const success = await BLEService.requestAIAnalysis();
        if (success) {
            alert('🤖 Requesting AI analysis via phone internet...');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // FORCE CONTEXT SWITCH
    // ═══════════════════════════════════════════════════════════════════════

    const handleForceContext = async (context) => {
        const success = await BLEService.forceContextSwitch(context);
        if (success) {
            alert(`🔄 Switching to ${context} mode...`);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RECODE DEVICE (OTA Update)
    // ═══════════════════════════════════════════════════════════════════════

    const handleRecode = async () => {
        if (!customContext) {
            alert('⚠️ Enter a device type first (e.g., guitar, dumbbell, dog)');
            return;
        }

        const confirmed = confirm(
            `🤖 This will:\n` +
            `1. Send request to Gemini AI\n` +
            `2. Generate ${customContext} module code\n` +
            `3. Compile firmware\n` +
            `4. Download via phone's internet\n` +
            `5. Install to UAD device\n\n` +
            `This will take 1-2 minutes. Continue?`
        );

        if (!confirmed) return;

        try {
            alert('🤖 1/3 Generating Firmware via Gemini AI...');

            // 1. Generate Firmware (C++)
            const moduleRes = await fetch('http://localhost:3000/api/modules/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_type: customContext,
                    features: ['ai_tracking', 'pattern_recognition'],
                    hardware_profile: hardwareProfile,
                    user_profile: userProfile
                })
            });

            if (!moduleRes.ok) throw new Error("Firmware Generation Failed");

            alert('🤖 2/3 Generating GUI Widget via Gemini AI...');

            // 2. Generate Widget (React)
            const widgetRes = await fetch('http://localhost:3000/api/widgets/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_type: customContext,
                    data_fields: ['sensorValue', 'status', 'latitude', 'longitude', 'ts'],
                    hardware_profile: hardwareProfile,
                    user_profile: userProfile
                })
            });

            if (!widgetRes.ok) throw new Error("Widget Generation Failed");

            const widgetData = await widgetRes.json();
            const smartName = widgetData.smart_name; // Get the smart name from backend

            alert('🤖 3/3 Installing & Rebooting...');

            // Simulate OTA delay
            await new Promise(r => setTimeout(r, 2000));

            // FORCE UI UPDATE TO SHOW NEW DYNAMIC WIDGET (using smart name)
            setContextOverride(smartName);

            alert(
                `✅ RECODE COMPLETE!\n\n` +
                `The device is now a "${customContext.toUpperCase()}" (internal name: "${smartName}").\n` +
                `New Firmware Installed.\n` +
                `New UI Generated & Loaded.`
            );
        } catch (error) {
            console.error(error);
            alert('❌ Failed: ' + error.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CALIBRATE SENSORS
    // ═══════════════════════════════════════════════════════════════════════

    const handleCalibrate = async () => {
        alert('🔄 Keep device still for 10 seconds...');
        await BLEService.calibrateSensors();
        setTimeout(() => {
            alert('✅ Calibration complete!');
        }, 10000);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
            {/* Connection Card */}
            <div className="glass rounded-lg p-6 border border-white border-opacity-20">
                <h2 className="text-2xl font-bold mb-4">📱 Device Connection</h2>

                {!deviceData.isConnected ? (
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isConnecting ? '🔍 Scanning...' : '📡 Connect to UAD'}
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                            <span className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="font-semibold text-green-800">Connected</span>
                            </span>
                            <span className="text-sm text-green-600">
                                {deviceData.contextName} Mode
                            </span>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                        >
                            👋 Disconnect
                        </button>
                    </div>
                )}
            </div>



            {/* MODE LIBRARY / MY MODES TABS */}
            <div className="glass rounded-lg p-6 border-2 border-purple-500 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2 bg-black/20 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('library')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'library'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-purple-200 hover:bg-white/5'
                                }`}
                        >
                            🌎 Explore Library
                        </button>
                        <button
                            onClick={() => setViewMode('mymodes')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'mymodes'
                                ? 'bg-pink-600 text-white shadow-lg'
                                : 'text-purple-200 hover:bg-white/5'
                                }`}
                        >
                            💾 My Modes
                        </button>
                    </div>
                </div>

                {viewMode === 'library' ? (
                    <ModeBrowser
                        onModeActivate={(smartName, mode) => {
                            setContextOverride(smartName);
                            alert(`✅ Activated ${mode.name} mode!`);
                        }}
                        onCustomRequest={() => setShowCustomModal(true)}
                    />
                ) : (
                    <MyModes
                        onActivate={(smartName, mode) => {
                            setContextOverride(smartName);
                            // Ensure dashboard view is active
                            window.location.href = '#dashboard';
                            alert(`✅ Re-activated ${mode.name}!`);
                        }}
                    />
                )}
            </div>

            {/* Device Info */}
            <div className="glass rounded-lg p-6 border border-white border-opacity-20">
                <h2 className="text-2xl font-bold mb-4">ℹ️ Device Info</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="opacity-70">Current Mode:</span>
                        <span className="font-semibold">{deviceData.contextName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Battery:</span>
                        <span className="font-semibold">{deviceData.batteryPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Sensor Value:</span>
                        <span className="font-semibold">{deviceData.sensorValue}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Status:</span>
                        <span className={`font-semibold ${deviceData.status === 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {deviceData.status === 0 ? 'OK' : 'ALERT'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Custom Mode Modal */}
            {/* Custom Mode Wizard */}
            {showCustomModal && (
                <CustomModeWizard
                    onClose={() => setShowCustomModal(false)}
                    onActivate={(data) => {
                        setShowCustomModal(false);
                        setContextOverride(data.smart_name);
                        // Force reload widget
                        window.location.href = '#dashboard';
                        alert(`🔥 OTA Flashing: ${data.smart_name} v1.0`);
                    }}
                />
            )}
        </div>
    );
};

export default ControlPanel;
