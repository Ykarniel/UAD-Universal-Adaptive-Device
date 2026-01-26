import React from 'react';
import { useDevice } from '../../contexts/DeviceContext';

const AssetView = () => {
    const { deviceData, getInterpretedValue, STATUS_CODES } = useDevice();

    const isTheftAlert = deviceData.status === STATUS_CODES.THEFT;
    const stationaryMinutes = deviceData.sensorValue;
    const stationaryHours = (stationaryMinutes / 60).toFixed(1);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Theft Alert */}
            {isTheftAlert && (
                <div className="bg-red-600 text-white p-6 rounded-lg animate-pulse">
                    <div className="flex items-center gap-3">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <h3 className="text-xl font-bold">🚨 MOTION DETECTED</h3>
                            <p>Possible theft! Asset is moving unexpectedly.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Card */}
            <div className="glass rounded-lg p-8 border border-asset-primary text-center">
                <h3 className="text-sm font-semibold text-asset-primary mb-2">STATIONARY TIME</h3>
                <div className="text-6xl font-bold text-asset-primary">{stationaryHours}</div>
                <p className="text-2xl mt-2 text-asset-secondary">hours</p>
                <p className="text-sm mt-4 opacity-70">({stationaryMinutes} minutes)</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location */}
                <div className="glass rounded-lg p-6 border border-asset-accent">
                    <h3 className="text-sm font-semibold opacity-70 mb-2">LOCATION</h3>
                    <div className="text-xl font-bold">Last Known Position</div>
                    <p className="text-sm mt-2 opacity-60">
                        📍 {deviceData.isConnected ? 'Within range' : 'Out of range'}
                    </p>
                </div>

                {/* Security Status */}
                <div className="glass rounded-lg p-6 border border-asset-accent">
                    <h3 className="text-sm font-semibold opacity-70 mb-2">SECURITY STATUS</h3>
                    <div className="text-xl font-bold">{isTheftAlert ? '🔴 Alert' : '🟢 Secure'}</div>
                    <p className="text-sm mt-2 opacity-60">
                        {isTheftAlert ? 'Motion detected' : 'No motion detected'}
                    </p>
                </div>
            </div>

            {/* Motion History */}
            <div className="glass rounded-lg p-6 border border-asset-accent">
                <h3 className="text-lg font-bold mb-4">Motion Log</h3>
                <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-asset-background bg-opacity-50 rounded">
                        <span>Device stationary</span>
                        <span className="text-sm opacity-70">Current</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-asset-background bg-opacity-50 rounded">
                        <span>Motion detected</span>
                        <span className="text-sm opacity-70">2 hours ago</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-asset-background bg-opacity-50 rounded">
                        <span>Device stationary</span>
                        <span className="text-sm opacity-70">5 hours ago</span>
                    </div>
                </div>
            </div>

            {/* Device Info */}
            <div className="glass rounded-lg p-6 border border-asset-accent">
                <h3 className="text-lg font-bold mb-4">Device Information</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm opacity-70">Device ID</p>
                        <p className="text-xl font-bold">#{deviceData.deviceId}</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-70">Battery</p>
                        <p className="text-xl font-bold text-asset-primary">{deviceData.batteryPercent}%</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-70">Signal</p>
                        <p className="text-xl font-bold">{deviceData.rssi} dBm</p>
                    </div>
                    <div>
                        <p className="text-sm opacity-70">Status</p>
                        <p className="text-xl font-bold text-asset-accent">Tracking</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetView;
