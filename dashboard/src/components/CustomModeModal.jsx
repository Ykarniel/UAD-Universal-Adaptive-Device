import React, { useState } from 'react';

/**
 * CustomModeModal - Beautiful modal for custom mode generation
 */
export default function CustomModeModal({ isOpen, onClose, onSubmit }) {
    const [deviceName, setDeviceName] = useState('');
    const [purpose, setPurpose] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!deviceName.trim() || !purpose.trim()) {
            alert('Please fill in both fields');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(deviceName, purpose);
            // Reset and close
            setDeviceName('');
            setPurpose('');
            onClose();
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/20 backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                                ✨
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Custom Mode Generator</h2>
                                <p className="text-sm text-gray-400">AI-powered device customization</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Device Name */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Device Name
                        </label>
                        <input
                            type="text"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="e.g., guitar tuner, door sensor, plant monitor"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <p className="mt-1 text-xs text-gray-400">What type of device is this?</p>
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Purpose & Features
                        </label>
                        <textarea
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="Describe what you want this device to do...&#10;&#10;Examples:&#10;• Track when the door opens and send alerts&#10;• Monitor soil moisture and remind me to water&#10;• Detect guitar string frequency and show tuning"
                            rows={5}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm resize-none"
                            disabled={isSubmitting}
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Be specific - this helps AI generate better code
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex gap-3">
                            <span className="text-2xl">ℹ️</span>
                            <div className="text-sm text-blue-200">
                                <p className="font-semibold mb-1">What happens next:</p>
                                <ol className="list-decimal list-inside space-y-1 text-blue-300">
                                    <li>AI generates custom firmware code (1 min)</li>
                                    <li>Creates a beautiful dashboard widget (1 min)</li>
                                    <li>Deploys to your device instantly</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50 border border-white/20"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !deviceName.trim() || !purpose.trim()}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/50"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </span>
                            ) : (
                                '🚀 Generate Mode'
                            )}
                        </button>
                    </div>
                </form>

                {/* Example Chips */}
                <div className="px-6 pb-6">
                    <p className="text-xs text-gray-400 mb-2">Quick examples:</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { name: 'Door Sensor', purpose: 'Track when door opens and closes' },
                            { name: 'Plant Monitor', purpose: 'Monitor soil moisture and send watering alerts' },
                            { name: 'Guitar Tuner', purpose: 'Detect string frequency and show tuning' },
                        ].map((example, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    setDeviceName(example.name);
                                    setPurpose(example.purpose);
                                }}
                                disabled={isSubmitting}
                                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded-full text-xs text-gray-300 hover:text-white transition-all disabled:opacity-50"
                            >
                                {example.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
