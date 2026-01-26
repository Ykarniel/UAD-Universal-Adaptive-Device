import React, { createContext, useContext, useState, useEffect } from 'react';
import BLEService from '../services/BLEService';
import { Capacitor } from '@capacitor/core';

// Context Types
const CONTEXT_TYPES = {
    UNKNOWN: 0x00,
    HELMET: 0x01,
    BICYCLE: 0x02,
    ASSET: 0x03,
    VEHICLE: 0x04,
    RUNNING_BUDDY: 0x05,
};

// Default Fallback (Code is dynamic, this is just the startup state)
const DEFAULT_DEVICE_MODE = 'GPS asset tracker';

const STATUS_CODES = {
    OK: 0x00,
    SOS: 0x01,
    LOW_BATT: 0x02,
    FALL: 0x03,
    IMPACT: 0x04,
    THEFT: 0x05,
};

const HARDWARE_PROFILE = {
    processor: "ESP32-S3 (Dual Core, AI Instructions)",
    sensors: [
        "IMU: MPU6050 (6-axis Accel/Gyro)",
        "GPS: NEO-M8N (Latitude, Longitude, Heading)",
        "Microphone: PDM Digital Mic (Pattern detection support)",
        "Temperature: Internal ESP32 Sensor",
        "Battery Monitor: Voltage divider to ADC Pin 34"
    ],
    actuators: [
        "RGB LED: WS2812B (Status signaling)",
        "Buzzer: Passive Piezo (Haptic/Audio alerts)"
    ]
};

const USER_PROFILE = {
    designLanguage: "Tech-Minimalist / Premium Dashboard",
    aesthetic: "Glassmorphism, Neon Accents, Dark High-Contrast",
    preferredComponents: ["Bento Cards", "Smooth Transitions", "Interactive Maps", "Real-time Telemetry Charts"]
};

// ...

const DeviceContext = createContext();

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({ children }) => {
    const [deviceData, setDeviceData] = useState({
        deviceId: 0,
        contextType: DEFAULT_DEVICE_MODE, // Using Constant
        contextName: DEFAULT_DEVICE_MODE,
        status: STATUS_CODES.OK,
        sensorValue: 0,
        batteryPercent: 100,
        rssi: -50,
        lastUpdate: null,
        isConnected: false,
    });

    const [telemetryHistory, setTelemetryHistory] = useState([]);

    const [overrideMode, setOverrideMode] = useState(null);

    // Simulated WebSocket connection
    useEffect(() => {
        const simulateData = () => {
            const interval = setInterval(() => {

                // Determine active context (Override takes precedence)
                const activeContextName = overrideMode || DEFAULT_DEVICE_MODE;
                // Use hash of name for consistent value
                const seed = activeContextName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                const baseValue = seed % 100;

                const newData = {
                    deviceId: 1,
                    contextType: activeContextName,
                    contextName: activeContextName,
                    status: STATUS_CODES.OK,
                    sensorValue: baseValue + Math.floor(Math.random() * 5),
                    batteryPercent: 85,
                    rssi: -80,
                    latitude: 32.0853 + (Math.random() - 0.5) * 0.01,
                    longitude: 34.7818 + (Math.random() - 0.5) * 0.01,
                    lastUpdate: new Date().toISOString(),
                    ts: Date.now(),
                    isConnected: true,
                };

                setDeviceData(newData);

                setTelemetryHistory(prev => [...prev.slice(-50), {
                    ...newData,
                    timestamp: Date.now(),
                }]);

            }, 2000);

            return () => clearInterval(interval);
        };

        return simulateData();
    }, [overrideMode]);

    // Get interpreted sensor value based on context
    const getInterpretedValue = () => {
        switch (deviceData.contextType) {
            case CONTEXT_TYPES.HELMET:
                return `${(deviceData.sensorValue / 100).toFixed(2)}g`;
            case CONTEXT_TYPES.BICYCLE:
                return `${(deviceData.sensorValue / 10).toFixed(1)} km/h`;
            case CONTEXT_TYPES.ASSET:
                return `${deviceData.sensorValue} min`;
            case CONTEXT_TYPES.RUNNING_BUDDY:
                return `${deviceData.sensorValue} spm`;
            default:
                return deviceData.sensorValue;
        }
    };

    const setContextOverride = (name) => {
        console.log("Setting Context Override:", name);
        setOverrideMode(name);
    };

    const value = {
        deviceData,
        telemetryHistory,
        getInterpretedValue,
        setContextOverride,
        hardwareProfile: HARDWARE_PROFILE,
        userProfile: USER_PROFILE,
        CONTEXT_TYPES,
        STATUS_CODES,
    };

    return (
        <DeviceContext.Provider value={value}>
            {children}
        </DeviceContext.Provider>
    );
};
