import React from 'react';
import { useDevice } from '../contexts/DeviceContext';
import DynamicWidgetLoader from './DynamicWidgetLoader';
import HelmetView from './views/HelmetView';
import BikeView from './views/BikeView';
import AssetView from './views/AssetView';
import DiscoveryView from './views/DiscoveryView';

const DashboardContainer = () => {
    const { deviceData, CONTEXT_TYPES } = useDevice();

    // Render appropriate view based on context
    const renderView = () => {
        let content;
        switch (deviceData.contextType) {
            case CONTEXT_TYPES.HELMET:
                content = <HelmetView />;
                break;
            case CONTEXT_TYPES.BICYCLE:
                content = <BikeView />;
                break;
            case CONTEXT_TYPES.ASSET:
                content = <AssetView />;
                break;
            case CONTEXT_TYPES.VEHICLE:
                content = <AssetView />; // Placeholder
                break;
            default:
                content = <DiscoveryView />;
        }

        return (
            <DynamicWidgetLoader contextType={deviceData.contextName}>
                {content}
            </DynamicWidgetLoader>
        );
    };

    const getStatusColor = () => {
        if (!deviceData.isConnected) return "text-gray-500";
        return "text-green-500";
    };

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* iOS Style Header */}
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 pt-safe-top">
                <div className="max-w-7xl mx-auto px-5 py-4 flex justify-between items-end">
                    <div>
                        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Summary</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Device Widget */}
                        <div className="bg-[#1C1C1E] rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${deviceData.isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'} transition-colors`} />
                            <span className="text-xs font-medium text-gray-300">
                                {deviceData.contextName || 'UAD'}
                            </span>
                        </div>

                        {/* Battery Widget */}
                        <div className="bg-[#1C1C1E] rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
                            <span className={`text-xs font-bold ${deviceData.batteryPercent < 20 ? 'text-red-500' : 'text-green-500'}`}>
                                {deviceData.batteryPercent}%
                            </span>
                            <div className="w-5 h-2.5 rounded-[3px] border border-gray-500 p-0.5 relative">
                                <div
                                    className={`h-full rounded-[1px] ${deviceData.batteryPercent < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${deviceData.batteryPercent}%` }}
                                />
                                <div className="absolute -right-1 top-0.5 w-[2px] h-1.5 bg-gray-500 rounded-r-[1px]" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-5 py-6 animation-fade-in">
                {renderView()}
            </main>
        </div>
    );
};

export default DashboardContainer;
