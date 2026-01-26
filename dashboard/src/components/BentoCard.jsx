import React from 'react';

const BentoCard = ({ title, value, unit, icon, color = "blue", children, className = "", size = "md" }) => {
    // Color mapping for Apple-style gradients
    const colors = {
        red: "from-red-500 to-pink-600 text-red-500",
        blue: "from-blue-500 to-cyan-500 text-blue-500",
        green: "from-green-500 to-emerald-400 text-green-500",
        orange: "from-orange-500 to-yellow-500 text-orange-500",
        purple: "from-purple-500 to-indigo-500 text-purple-500",
        gray: "from-gray-500 to-gray-400 text-gray-500",
    };

    const selectedColor = colors[color] || colors.blue;
    const gradient = selectedColor.split(" ")[0] + " " + selectedColor.split(" ")[1];
    const textColor = selectedColor.split(" ")[2];

    // Size classes
    const sizeClasses = {
        sm: "col-span-1 row-span-1",
        md: "col-span-2 row-span-1",
        lg: "col-span-2 row-span-2",
        full: "col-span-full",
    };

    return (
        <div className={`bento-card group ${sizeClasses[size]} ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-current opacity-20 ${textColor}`}>
                        <span className="text-lg opacity-100">{icon}</span>
                    </div>
                    <h3 className={`font-semibold uppercase text-xs tracking-wider ${textColor}`}>{title}</h3>
                </div>
                {/* Action Icon (Arrow) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            <div className="mt-1">
                {value && (
                    <div className="flex items-baseline gap-1">
                        <span className="text-ios-stat text-white">{value}</span>
                        {unit && <span className="text-gray-400 font-medium">{unit}</span>}
                    </div>
                )}

                {/* Custom Children (Charts etc) */}
                <div className="mt-2 text-gray-400 text-sm">
                    {children}
                </div>
            </div>

            {/* Ambient Glow (Apple Style) */}
            {/* <div className={`absolute -right-10 -bottom-10 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 blur-3xl rounded-full pointer-events-none`} /> */}
        </div>
    );
};

export default BentoCard;
