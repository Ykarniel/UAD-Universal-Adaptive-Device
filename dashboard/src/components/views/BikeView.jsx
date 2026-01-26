import React from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import BentoCard from '../BentoCard';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

const BikeView = () => {
    const { deviceData, telemetryHistory } = useDevice();

    const currentSpeed = deviceData.sensorValue / 10; // km/h

    // Chart data for speed history
    const chartData = telemetryHistory.slice(-30).map((item, index) => ({
        time: index,
        speed: item.sensorValue / 10,
    }));

    // Calculate stats
    const avgSpeed = chartData.length > 0
        ? (chartData.reduce((sum, d) => sum + d.speed, 0) / chartData.length).toFixed(1)
        : 0;
    const distance = (avgSpeed * (chartData.length * 2 / 3600)).toFixed(2); // Rough estimate
    const calories = Math.floor(distance * 45);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Speed Gauge - Main */}
            <BentoCard
                title="Current Speed"
                value={currentSpeed.toFixed(1)}
                unit="km/h"
                color="blue"
                icon="🚴"
                size="lg"
            >
                <div className="h-32 mt-4 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="speed"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorSpeed)"
                            />
                            <YAxis hide domain={[0, 40]} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </BentoCard>

            {/* Distance */}
            <BentoCard
                title="Distance"
                value={distance}
                unit="km"
                color="green"
                icon="📍"
                size="md"
            />

            {/* Calories */}
            <BentoCard
                title="Calories"
                value={calories}
                unit="kcal"
                color="orange"
                icon="🔥"
                size="md"
            />

            {/* Average Speed */}
            <BentoCard
                title="Avg Speed"
                value={avgSpeed}
                unit="km/h"
                color="blue"
                icon="⏱️"
                size="sm"
            />

            {/* Battery */}
            <BentoCard
                title="Battery"
                value={deviceData.batteryPercent}
                unit="%"
                color={deviceData.batteryPercent > 20 ? 'green' : 'red'}
                icon="🔋"
                size="sm"
            />
        </div>
    );
};

export default BikeView;
