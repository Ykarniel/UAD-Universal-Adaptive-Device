import React from 'react';

/**
 * ModeCard - Display an individual mode with icon, name, description, and stats
 */
export default function ModeCard({ mode, onActivate, isPremium = false }) {
    const getCategoryColor = (category) => {
        const colors = {
            fitness: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
            music: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
            home: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
            security: 'from-red-500/20 to-orange-500/20 border-red-500/30',
            hobby: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
        };
        return colors[category] || colors.hobby;
    };

    const getCategoryBadgeColor = (category) => {
        const colors = {
            fitness: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            music: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            home: 'bg-green-500/20 text-green-300 border-green-500/30',
            security: 'bg-red-500/20 text-red-300 border-red-500/30',
            hobby: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        };
        return colors[category] || colors.hobby;
    };

    return (
        <div
            className={`
                relative rounded-2xl p-6 cursor-pointer
                bg-gradient-to-br ${getCategoryColor(mode.category)}
                border backdrop-blur-xl
                transition-all duration-300
                hover:scale-105 hover:shadow-2xl hover:shadow-${mode.category === 'fitness' ? 'blue' : mode.category === 'music' ? 'purple' : 'green'}-500/20
                group
            `}
            onClick={() => onActivate(mode)}
        >
            {/* Featured Badge */}
            {mode.featured && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                    ⭐ Featured
                </div>
            )}

            {/* Verified Badge */}
            {mode.verified && (
                <div className="absolute top-3 right-3 text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                </div>
            )}

            {/* Premium Badge */}
            {isPremium && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    PRO
                </div>
            )}

            {/* Icon */}
            <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {mode.icon || '📦'}
            </div>

            {/* Name */}
            <h3 className="text-xl font-bold text-white mb-2">
                {mode.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                {mode.description}
            </p>

            {/* Category Badge */}
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryBadgeColor(mode.category)} mb-3`}>
                {mode.category}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                {mode.rating > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span>{mode.rating}</span>
                    </div>
                )}
                <div className="flex items-center gap-1">
                    <span>📥</span>
                    <span>{mode.downloads || 0}</span>
                </div>
            </div>

            {/* Sensors */}
            {mode.sensors && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {mode.sensors.map(sensor => (
                        <span key={sensor} className="bg-white/10 text-gray-300 text-xs px-2 py-1 rounded">
                            {sensor}
                        </span>
                    ))}
                </div>
            )}

            {/* Activate Button */}
            <button
                className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-200 backdrop-blur-sm border border-white/20"
                onClick={(e) => {
                    e.stopPropagation();
                    onActivate(mode);
                }}
            >
                {isPremium ? '✨ Generate Custom' : '🚀 Activate'}
            </button>
        </div>
    );
}
