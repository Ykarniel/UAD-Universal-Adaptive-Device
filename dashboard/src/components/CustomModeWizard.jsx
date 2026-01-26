import React, { useState, useEffect } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import BentoCard from './BentoCard';

/**
 * Custom Mode Wizard
 * 5-Step Process: Feasibility -> Hardware -> Generation -> Review -> Activation
 */
const CustomModeWizard = ({ onClose, onActivate }) => {
    const { hardwareProfile, userProfile } = useDevice();

    // Wizard State
    const [step, setStep] = useState(0); // 0=Input, 1=Feasibility, 2=Hardware, 3=Generate, 4=Review
    const [inputs, setInputs] = useState({ name: '', purpose: '', refinements: '' });
    const [feasibility, setFeasibility] = useState(null);
    const [hwConfig, setHwConfig] = useState({});
    const [genResult, setGenResult] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Step 0: Input Form
    const renderInputStep = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6">
                <span className="text-4xl mb-2 block">✨</span>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                    Create Custom Mode
                </h3>
                <p className="text-white/60 text-sm">Describe your dream device, AI builds it.</p>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs uppercase tracking-widest text-white/50 font-bold ml-1">Device Name</label>
                    <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="e.g. Smart Plant Guardian"
                        value={inputs.name}
                        onChange={e => setInputs({ ...inputs, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-xs uppercase tracking-widest text-white/50 font-bold ml-1">Purpose & Logic</label>
                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 h-24 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                        placeholder="e.g. Monitor soil moisture. If < 20%, flash red LED and alert me. Otherwise pulse green."
                        value={inputs.purpose}
                        onChange={e => setInputs({ ...inputs, purpose: e.target.value })}
                    />
                </div>
            </div>

            <button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-500/30 transition-all transform hover:scale-[1.02 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!inputs.name || !inputs.purpose || isProcessing}
                onClick={analyzeFeasibility}
            >
                {isProcessing ? '🤖 Analyzing Hardware...' : 'Next: Check Feasibility ➜'}
            </button>
        </div>
    );

    // Step 1: Feasibility Result
    const renderFeasibilityStep = () => (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className={`p-6 rounded-2xl border-2 ${feasibility?.possible ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                <div className="flex items-center gap-4 mb-3">
                    <span className="text-3xl">{feasibility?.possible ? '✅' : '⚠️'}</span>
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {feasibility?.possible ? 'Feasibility Confirmed' : 'Hardware Mismatch'}
                        </h3>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${feasibility?.difficulty === 'Easy' ? 'bg-blue-500/20 text-blue-300' :
                            feasibility?.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                            Complexity: {feasibility?.difficulty}
                        </div>
                    </div>
                </div>
                <p className="text-white/80 leading-relaxed text-sm">
                    {feasibility?.reasoning}
                </p>
            </div>

            {feasibility?.warnings?.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                    <h4 className="text-orange-300 font-bold text-xs uppercase mb-2">Warnings</h4>
                    <ul className="list-disc list-inside text-sm text-orange-200/80 space-y-1">
                        {feasibility.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStep(0)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium">
                    ← Edit Idea
                </button>
                <button
                    onClick={() => setStep(2)}
                    className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-lg hover:shadow-cyan-500/30"
                >
                    Hardware Setup ➜
                </button>
            </div>
        </div>
    );

    // Step 2: Hardware IO (Advanced)
    const renderHardwareStep = () => (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-white text-lg">🎛️ Hardware I/O</h3>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">Optional</span>
            </div>

            <p className="text-xs text-white/50 mb-4">Map physical buttons and screens to functions. Skip if you want AI to decide.</p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Button A */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-xs font-mono">A</div>
                        <span className="text-sm font-medium text-white">Button A (GPIO 0)</span>
                    </div>
                    <select
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        onChange={e => setHwConfig({ ...hwConfig, BTN_A: e.target.value })}
                    >
                        <option value="">Auto-Assign</option>
                        <option value="TRIGGER">Primary Trigger</option>
                        <option value="NEXT">Next / Increment</option>
                        <option value="RESET">Reset / Clear</option>
                    </select>
                </div>

                {/* OLED */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-cyan-900/40 border border-cyan-500/20 flex items-center justify-center text-lg">🖥️</div>
                        <span className="text-sm font-medium text-white">OLED Screen</span>
                    </div>
                    <select
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        onChange={e => setHwConfig({ ...hwConfig, OLED: e.target.value })}
                    >
                        <option value="">Auto-Assign</option>
                        <option value="STATUS">Show Status</option>
                        <option value="DATA">Real-time Data</option>
                        <option value="DEBUG">Debug Log</option>
                    </select>
                </div>

                {/* RGB LED */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 opacity-80 flex items-center justify-center text-xs">💡</div>
                        <span className="text-sm font-medium text-white">NeoPixel</span>
                    </div>
                    <select
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        onChange={e => setHwConfig({ ...hwConfig, LED: e.target.value })}
                    >
                        <option value="">Auto-Assign</option>
                        <option value="STATUS">Status Indicator</option>
                        <option value="ALERT">Alert Only</option>
                        <option value="MOOD">Mood Lighting</option>
                    </select>
                </div>
            </div>

            <button
                className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-xl font-bold text-white shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:scale-[1.02]"
                onClick={startGeneration}
                disabled={isProcessing}
            >
                {isProcessing ? '⚙️ Generating Firmware...' : '✨ Generate V1.0'}
            </button>
        </div>
    );

    // Step 4: Review (Skipping 3: Loading handled by state)
    const renderReviewStep = () => (
        <div className="space-y-5 animate-in slide-in-from-right duration-300">
            <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-green-500/30 animate-bounce">
                    🚀
                </div>
                <h3 className="text-2xl font-bold text-white">Ready to Launch!</h3>
                <p className="text-white/60 text-sm">Review your new mode before flashing.</p>
            </div>

            {/* Code Summary Card */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/10 font-mono text-xs text-green-300 overflow-hidden relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white">Edit Code</button>
                </div>
                <p className="opacity-50 mb-2">// generated_modules/{genResult?.smart_name}_module.h</p>
                <div className="opacity-80 line-clamp-6">
                    {genResult?.code?.substring(0, 300)}...
                </div>
            </div>

            {/* Widget Preview Card */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                    <span>📱</span> Widget Preview
                </h4>
                <div className="flex gap-2">
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">Chart: Area</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">Controls: 3</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">Auto-Refresh</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                    onClick={() => {
                        // Add refinement flow here later
                        setStep(0);
                        setInputs({ ...inputs, refinements: 'Add this feature: ' });
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10"
                >
                    ➕ Add Feature
                </button>
                <button
                    onClick={() => onActivate(genResult)}
                    className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg hover:shadow-green-500/30 animate-pulse"
                >
                    🔥 Flash OTA
                </button>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // Logic Handlers
    // ─────────────────────────────────────────────────────────────────────────────

    const analyzeFeasibility = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch('http://localhost:3000/api/modes/feasibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceName: inputs.name,
                    purpose: inputs.purpose,
                    hardware: hardwareProfile
                })
            });
            const data = await res.json();
            setFeasibility(data);
            setStep(1);
        } catch (e) {
            console.error(e);
            alert("Feasibility Check Failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const startGeneration = async () => {
        setIsProcessing(true);
        try {
            // 1. Generate C++ Module
            const modRes = await fetch('http://localhost:3000/api/modules/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_type: inputs.name, // Use name as type
                    features: [inputs.purpose, JSON.stringify(hwConfig)],
                    hardware_profile: hardwareProfile,
                    user_profile: userProfile
                })
            });
            const modData = await modRes.json();

            // 2. Generate React Widget (Auto-saved to My Modes)
            const widgetRes = await fetch('http://localhost:3000/api/widgets/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_type: inputs.name,
                    description: inputs.purpose,
                    data_fields: ['sensorValue', 'status'], // Default fields
                    hardware_profile: hardwareProfile,
                    user_profile: userProfile
                })
            });
            const widgetData = await widgetRes.json();

            setGenResult({
                ...widgetData,
                modulePath: modData.path
            });

            setStep(4); // Review

        } catch (e) {
            console.error(e);
            alert("Generation Failed");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex gap-1">
                        {[0, 1, 2, 4].map(s => (
                            <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${step >= s ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/10'
                                }`} />
                        ))}
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {step === 0 && renderInputStep()}
                    {step === 1 && renderFeasibilityStep()}
                    {step === 2 && renderHardwareStep()}
                    {step === 3 && renderEditorStep()}
                    {step === 4 && renderReviewStep()}
                </div>
            </div>
        </div>
    );
};

export default CustomModeWizard;
