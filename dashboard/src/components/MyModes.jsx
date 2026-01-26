import React, { useState, useEffect } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import BentoCard from './BentoCard';

/**
 * MyModes Component
 * Displays user's custom saved modes with status management
 */
const MyModes = ({ onActivate }) => {
    const [modes, setModes] = useState([]);
    const [filter, setFilter] = useState('all'); // all, active, draft, favorite
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchModes();
    }, [filter]);

    const fetchModes = async () => {
        setIsLoading(true);
        try {
            const query = new URLSearchParams();
            if (filter !== 'all') query.append('status', filter);
            if (searchTerm) query.append('search', searchTerm);

            const res = await fetch(`http://localhost:3000/api/my-modes?${query.toString()}`);
            const data = await res.json();
            setModes(data.modes);
        } catch (err) {
            console.error('Failed to load My Modes:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        // Debounce would be better here, but simple for now
        setTimeout(fetchModes, 500);
    };

    const toggleFavorite = async (e, mode) => {
        e.stopPropagation();
        const newStatus = mode.status === 'favorite' ? 'draft' : 'favorite';

        try {
            await fetch(`http://localhost:3000/api/my-modes/${mode.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchModes(); // Refresh
        } catch (err) {
            console.error('Failed to update favorite:', err);
        }
    };

    const deleteMode = async (e, modeId) => {
        e.stopPropagation();
        if (!confirm('Move this mode to trash?')) return;

        try {
            await fetch(`http://localhost:3000/api/my-modes/${modeId}`, {
                method: 'DELETE'
            });
            fetchModes();
        } catch (err) {
            console.error('Failed to delete mode:', err);
        }
    };

    const activateMode = async (mode) => {
        try {
            await fetch(`http://localhost:3000/api/my-modes/${mode.id}/activate`, {
                method: 'POST'
            });
            onActivate(mode.smartName, mode);
            fetchModes(); // Refresh to show active status
        } catch (err) {
            console.error('Failed to activate mode:', err);
            alert('Failed to activate mode');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                    {['all', 'active', 'favorite', 'draft'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'bg-purple-500 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <input
                    type="text"
                    placeholder="Search your modes..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full md:w-64 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-white/5 rounded-2xl border border-white/10" />
                    ))}
                </div>
            ) : modes.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Saved Modes Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Generations from the "Custom Mode" tool will automatically appear here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modes.map(mode => (
                        <div
                            key={mode.id}
                            onClick={() => activateMode(mode)}
                            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer hover:transform hover:scale-[1.02] ${mode.status === 'active'
                                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-900/40 border-green-500/50 shadow-green-500/20 shadow-lg'
                                    : 'bg-white/5 border-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10'
                                }`}
                        >
                            {/* Status Badge */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                {mode.status === 'active' && (
                                    <span className="px-2 py-1 bg-green-500 text-black text-xs font-bold rounded-full shadow-lg">
                                        ACTIVE
                                    </span>
                                )}
                                <button
                                    onClick={(e) => toggleFavorite(e, mode)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${mode.status === 'favorite'
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-black/40 text-gray-400 hover:bg-white hover:text-black'
                                        }`}
                                >
                                    {mode.status === 'favorite' ? '★' : '☆'}
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${mode.status === 'active' ? 'bg-green-500 text-black' : 'bg-white/10 text-white'
                                        }`}>
                                        {mode.icon || '🚀'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg leading-tight mb-1">
                                            {mode.name}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            v{mode.version} • {new Date(mode.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Prompt preview */}
                                <p className="text-sm text-gray-400 mb-6 line-clamp-2 min-h-[2.5em]">
                                    {mode.originalPrompt || "No description provided."}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                                    <div className="text-xs text-gray-500">
                                        Activated {mode.activationCount} times
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => deleteMode(e, mode.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Move to trash"
                                        >
                                            🗑️
                                        </button>
                                        <button className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                                            {mode.status === 'active' ? 'Re-flash' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyModes;
