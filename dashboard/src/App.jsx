import React, { useState } from 'react';
import { DeviceProvider } from './contexts/DeviceContext';
import DashboardContainer from './components/DashboardContainer';
import ControlPanel from './components/ControlPanel';
import SavedModesPanel from './components/SavedModesPanel';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <DeviceProvider>
            {/* Tab Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 py-4 text-center text-sm font-semibold ${activeTab === 'dashboard'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('control')}
                        className={`flex-1 py-4 text-center text-sm font-semibold ${activeTab === 'control'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                    >
                        🎮 Control
                    </button>
                    <button
                        onClick={() => setActiveTab('modes')}
                        className={`flex-1 py-4 text-center text-sm font-semibold ${activeTab === 'modes'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                    >
                        💾 Modes
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="pt-16">
                {activeTab === 'dashboard' && <DashboardContainer />}
                {activeTab === 'control' && (
                    <div className="bg-gray-900 min-h-screen text-white">
                        <ControlPanel />
                    </div>
                )}
                {activeTab === 'modes' && (
                    <div className="bg-gray-900 min-h-screen text-white">
                        <SavedModesPanel />
                    </div>
                )}
            </div>
        </DeviceProvider>
    );
}

export default App;
