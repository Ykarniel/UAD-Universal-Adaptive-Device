import React, { useState, useEffect } from 'react';
import ModeCard from './ModeCard';

/**
 * ModeBrowser - Main mode library interface
 */
export default function ModeBrowser({ onModeActivate, onCustomRequest }) {
    const [modes, setModes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFeatured, setShowFeatured] = useState(false);

    const categories = [
        { id: 'all', name: 'All Modes', icon: '🌟' },
        { id: 'fitness', name: 'Fitness', icon: '🏃' },
        { id: 'music', name: 'Music', icon: '🎸' },
        { id: 'home', name: 'Home', icon: '🏠' },
        { id: 'security', name: 'Security', icon: '🔒' },
        { id: 'hobby', name: 'Hobby', icon: '🎮' },
    ];

    useEffect(() => {
        fetchModes();
    }, [selectedCategory, searchQuery, showFeatured]);

    const fetchModes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCategory !== 'all') params.append('category', selectedCategory);
            if (searchQuery) params.append('search', searchQuery);
            if (showFeatured) params.append('featured', 'true');

            const response = await fetch(`http://localhost:3000/api/modes?${params}`);
            const data = await response.json();
            setModes(data.modes || []);
        } catch (error) {
            console.error('Failed to fetch modes:', error);
            setModes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (mode) => {
        console.log('Activating mode:', mode);
        try {
            const response = await fetch('http://localhost:3000/api/modes/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modeId: mode.id }),
            });

            const result = await response.json();

            if (response.ok) {
                onModeActivate(result.smartName, mode);
            } else {
                alert(result.message || 'Failed to activate mode');
            }
        } catch (error) {
            console.error('Error activating mode:', error);
            alert('Failed to activate mode. Please try again.');
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">📚 Mode Library</h2>
                <p className="text-gray-400">Choose a verified mode or create your own</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search modes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 pl-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        🔍
                    </span>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200
                            ${selectedCategory === cat.id
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'}
                        `}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center gap-2 mb-6">
                <button
                    onClick={() => setShowFeatured(!showFeatured)}
                    className={`
                        px-4 py-2 rounded-lg font-medium transition-all duration-200
                        ${showFeatured
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'}
                    `}
                >
                    ⭐ {showFeatured ? 'Showing Featured' : 'Show Featured Only'}
                </button>
                <span className="text-gray-400 text-sm">
                    {modes.length} mode{modes.length !== 1 ? 's' : ''} found
                </span>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin text-6xl">⚙️</div>
                    <p className="text-gray-400 mt-4">Loading modes...</p>
                </div>
            )}

            {/* Modes Grid */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Verified Modes */}
                    {modes.map(mode => (
                        <ModeCard
                            key={mode.id}
                            mode={mode}
                            onActivate={handleActivate}
                        />
                    ))}

                    {/* Custom Mode Card (always visible) */}
                    <ModeCard
                        mode={{
                            id: 'custom',
                            name: 'Custom Mode',
                            description: 'Create your own unique mode with AI. Perfect for specialized tracking needs.',
                            icon: '✨',
                            category: 'hobby',
                            verified: false,
                            featured: false,
                            sensors: ['AI-Generated'],
                        }}
                        onActivate={onCustomRequest}
                        isPremium={true}
                    />
                </div>
            )}

            {/* Empty State */}
            {!loading && modes.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-400">No modes found. Try a different search or category.</p>
                </div>
            )}
        </div>
    );
}
