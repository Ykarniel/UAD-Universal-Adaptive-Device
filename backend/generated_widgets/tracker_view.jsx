import React, { useMemo, useEffect, useState } from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import BentoCard from '../BentoCard';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

// 1. Defined MapPinIcon manually (Fixes the crash)
const MapPinIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 16.5V15a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1.5" />
    <path d="M2 10h20" />
    <path d="M6 10l-2-5h16l-2 5" />
    <path d="M3 10v6h1" />
    <path d="M20 10v6h-1" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

const TrackerView = () => {
  const { deviceData, telemetryHistory } = useDevice();
  const [lastUpdateText, setLastUpdateText] = useState('just now');

  const chartData = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return Array.from({ length: 12 }, (_, i) => ({ time: `T-${11 - i}`, speed: 0 }));
    }
    return telemetryHistory.slice(-20).map(item => ({
      time: new Date(item.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      speed: item.sensorValue ?? 0,
    }));
  }, [telemetryHistory]);

  const latestReading = useMemo(() => ({
    speed: deviceData?.sensorValue ?? 0,
    isDriving: (deviceData?.status ?? 1) === 0,
    latitude: deviceData?.latitude ?? 40.7128,
    longitude: deviceData?.longitude ?? -74.0060,
    battery: deviceData?.batteryPercent ?? 100,
    signal: deviceData?.rssi ?? -75,
    vehicleName: deviceData?.contextName ?? 'Vehicle CX-5',
    timestamp: deviceData?.ts ?? Date.now(),
  }), [deviceData]);

  const batteryColor = useMemo(() => {
    if (latestReading.battery > 50) return 'green';
    if (latestReading.battery > 20) return 'orange';
    return 'red';
  }, [latestReading.battery]);

  useEffect(() => {
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - latestReading.timestamp) / 1000);
      if (seconds < 10) setLastUpdateText('just now');
      else if (seconds < 60) setLastUpdateText(`${seconds}s ago`);
      else setLastUpdateText(`${Math.floor(seconds / 60)}m ago`);
    };
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [latestReading.timestamp]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl bg-black/80 backdrop-blur-md border border-white/20 p-3 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
          <p className="text-xs text-white/70">{payload[0].payload.time}</p>
          <p className="text-sm font-bold text-cyan-300">{`${payload[0].value.toFixed(0)} km/h`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 grid-rows-auto lg:grid-rows-2 gap-4 p-2 animate-[fadeIn_0.5s_ease-out]">

      {/* ===== HERO CARD ===== */}
      <div className="col-span-1 md:col-span-2 row-span-2 rounded-3xl bg-gradient-to-br from-cyan-900/40 via-black/30 to-purple-900/20 border border-white/10 p-6 shadow-2xl flex flex-col justify-between backdrop-blur-sm">
        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                <CarIcon className="w-8 h-8 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest text-white/60 font-semibold">{latestReading.vehicleName}</p>
                <p className="text-xs text-white/40">{lastUpdateText}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${latestReading.isDriving ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300' : 'bg-gray-500/20 border border-gray-400/30 text-gray-300'}`}>
              <span className={`w-2 h-2 rounded-full ${latestReading.isDriving ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
              {latestReading.isDriving ? 'DRIVING' : 'PARKED'}
            </div>
          </div>
          <div className="mt-8">
            <p className="text-xs uppercase tracking-widest text-white/60">Current Speed</p>
            <p className="text-5xl lg:text-6xl font-bold text-white tracking-tight mt-1">
              {latestReading.speed.toFixed(0)}
              <span className="text-2xl font-medium text-white/50 ml-2">km/h</span>
            </p>
          </div>
        </div>

        <div className="h-[150px] -ml-4 -mr-2 -mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(200, 80%, 60%)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} width={30} domain={[0, 'dataMax + 20']} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(200, 80%, 60%)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="speed" stroke="hsl(200, 80%, 60%)" strokeWidth={3} fill="url(#speedGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== MAP CARD ===== */}
      <div className="col-span-1 md:col-span-2 row-span-1 lg:row-span-2 rounded-3xl bg-black/20 border border-white/10 p-4 shadow-xl overflow-hidden backdrop-blur-sm flex flex-col min-h-[300px] lg:min-h-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            {/* 2. FIXED: Used the new MapPinIcon component */}
            <MapPinIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider">Live Location</h3>
            <p className="text-xs text-white/50">{`${latestReading.latitude.toFixed(4)}, ${latestReading.longitude.toFixed(4)}`}</p>
          </div>
        </div>
        <div className="w-full flex-grow rounded-2xl overflow-hidden border-2 border-white/10">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${latestReading.longitude - 0.005},${latestReading.latitude - 0.005},${latestReading.longitude + 0.005},${latestReading.latitude + 0.005}&layer=mapnik&marker=${latestReading.latitude},${latestReading.longitude}`}
            className="w-full h-full grayscale-[50%] contrast-125"
            title="Device Location"
            loading="lazy"
          />
        </div>
      </div>

      {/* ===== METRIC CARDS ===== */}
      {/* 3. FIXED: Removed lg:hidden so they appear on desktop as grid items */}
      <div className="col-span-1 md:col-span-1 rounded-3xl bg-black/20 border border-white/10 p-4 shadow-xl backdrop-blur-sm">
        <BentoCard
          title="Battery"
          value={latestReading.battery}
          unit="%"
          icon={<div className="text-2xl">🔋</div>}
          color={batteryColor}
          size="full"
        />
      </div>
      <div className="col-span-1 md:col-span-1 rounded-3xl bg-black/20 border border-white/10 p-4 shadow-xl backdrop-blur-sm">
        <BentoCard
          title="Signal"
          value={latestReading.signal}
          unit="dBm"
          icon={<div className="text-2xl">📡</div>}
          color="blue"
          size="full"
        />
      </div>
    </div>
  );
};

export default TrackerView;