import React from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import BentoCard from '../BentoCard';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const HelmetView = () => {
    const { deviceData, telemetryHistory, getInterpretedValue, STATUS_CODES } = useDevice();

    const isFallDetected = deviceData.status === STATUS_CODES.FALL;
    const isSOSActive = deviceData.status === STATUS_CODES.SOS;

    // Smoother chart data
    const chartData = telemetryHistory.slice(-30).map((item, index) => ({
        time: index,
        impact: item.sensorValue / 100, // Convert to g's
    }));

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Critical Alerts - Full Width */}
            {(isFallDetected || isSOSActive) && (
                <div className="col-span-full bg-red-500 rounded-[22px] p-6 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="text-white">
                            <h2 className="text-2xl font-bold">{isSOSActive ? 'SOS ALERT' : 'FALL DETECTED'}</h2>
                            <p className="opacity-90">Emergency contacts notified. Location shared.</p>
                        </div>
                    </div>
                    <button className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-white/90">
                        DISMISS
                    </button>
                </div>
            )}

            {/* Main Metric - Impact Force */}
            <BentoCard
                title="Impact Force"
                value={getInterpretedValue()}
                color="red"
                icon="💥"
                size="md"
            >
                <div className="h-24 mt-4 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <Line
                                type="monotone"
                                dataKey="impact"
                                stroke="#EF4444"
                                strokeWidth={3}
                                dot={false}
                                className="drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                            />
                            <YAxis hide domain={[0, 'auto']} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </BentoCard>

            {/* Safety Status */}
            <BentoCard
                title="Safety Status"
                size="md"
                color="green"
                icon="🛡️"
                className="bg-gradient-to-br from-green-900/20 to-emerald-900/20"
            >
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="text-2xl font-bold text-white">Secure</div>
                    <p className="text-green-500/70 text-sm">Monitoring Active</p>
                </div>
            </BentoCard>

            {/* Fall History */}
            <BentoCard
                title="Fall Events"
                value={telemetryHistory.filter(d => d.status === STATUS_CODES.FALL).length || "0"}
                color="orange"
                icon="⚠️"
                size="sm"
            >
                <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
                <div className="mt-2 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full w-[2%] rounded-full" />
                </div>
            </BentoCard>

            {/* Signal */}
            <BentoCard
                title="Connection"
                value={`${deviceData.rssi} dB`}
                color="blue"
                icon="📶"
                size="sm"
            >
                <div className="flex gap-1 mt-3">
                    <div className={`h-2 w-2 rounded-full ${deviceData.rssi > -100 ? 'bg-blue-500' : 'bg-gray-700'}`} />
                    <div className={`h-3 w-2 rounded-full ${deviceData.rssi > -90 ? 'bg-blue-500' : 'bg-gray-700'}`} />
                    <div className={`h-4 w-2 rounded-full ${deviceData.rssi > -80 ? 'bg-blue-500' : 'bg-gray-700'}`} />
                    <div className={`h-5 w-2 rounded-full ${deviceData.rssi > -70 ? 'bg-blue-500' : 'bg-gray-700'}`} />
                </div>
            </BentoCard>

            {/* SOS Trigger */}
            <BentoCard
                title="Emergency"
                size="full"
                color="red"
                icon="🆘"
                className="bg-red-900/10 border-red-500/20"
            >
                <button className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95">
                    <span>HOLD TO TRIGGER SOS</span>
                </button>
            </BentoCard>
        </div>
    );
};

export default HelmetView;
