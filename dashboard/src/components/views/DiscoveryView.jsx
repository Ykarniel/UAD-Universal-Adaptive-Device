import React from 'react';
import BentoCard from '../BentoCard';
import { useDevice } from '../../contexts/DeviceContext';

const DiscoveryView = () => {
    const { deviceData } = useDevice();

    // Simulate real-time sensor data for visualization
    const accelX = (Math.sin(Date.now() / 500) * 0.5 + 1.0).toFixed(2);
    const accelY = (Math.cos(Date.now() / 700) * 0.3).toFixed(2);
    const accelZ = (Math.sin(Date.now() / 900) * 0.2).toFixed(2);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Main Status - Large Card */}
            <BentoCard
                title="Status"
                size="lg"
                color="purple"
                icon="🔍"
                className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50"
            >
                <div className="flex flex-col items-center justify-center h-full pt-4">
                    <div className="relative w-32 h-32 mb-6">
                        <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping opacity-20" />
                        <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
                        <div className="absolute inset-4 bg-purple-500/20 rounded-full backdrop-blur-sm flex items-center justify-center">
                            <span className="text-3xl">AI</span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">Scanning</h2>
                    <p className="text-purple-300/70 text-center text-sm px-4">
                        Analyzing movement patterns to determine context...
                    </p>
                </div>
            </BentoCard>

            {/* AI Confidence */}
            <BentoCard
                title="Confidence"
                value="Analyzing"
                color="blue"
                icon="🧠"
                size="md"
            >
                <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Bicycle</span>
                        <span>68%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-[68%] rounded-full" />
                    </div>

                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Walking</span>
                        <span>24%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full w-[24%] rounded-full" />
                    </div>
                </div>
            </BentoCard>

            {/* Sensor Data - Accelerometer */}
            <BentoCard
                title="Motion (G)"
                value={accelX}
                unit="g"
                color="orange"
                icon="📈"
                size="md"
            >
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="bg-white/5 rounded p-2">
                        <div className="text-xs text-gray-500">X</div>
                        <div className="font-mono text-orange-400">{accelX}</div>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <div className="text-xs text-gray-500">Y</div>
                        <div className="font-mono text-orange-400">{accelY}</div>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <div className="text-xs text-gray-500">Z</div>
                        <div className="font-mono text-orange-400">{accelZ}</div>
                    </div>
                </div>
            </BentoCard>

            {/* Recommended Sensors */}
            <BentoCard
                title="Hardware"
                size="full"
                color="gray"
                icon="🛠️"
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                            🎤
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">Mic</div>
                            <div className="text-xs text-green-500">Ready</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                            📍
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">GPS</div>
                            <div className="text-xs text-gray-500">Searching</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                            👁️
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">Light</div>
                            <div className="text-xs text-orange-500">Active</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-opacity-50">
                        <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-500">
                            🌡️
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-400">Temp</div>
                            <div className="text-xs text-gray-600">N/A</div>
                        </div>
                    </div>
                </div>
            </BentoCard>
        </div>
    );
};

export default DiscoveryView;
