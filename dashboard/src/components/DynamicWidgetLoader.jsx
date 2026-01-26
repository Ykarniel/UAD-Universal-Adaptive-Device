import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import BentoCard from './BentoCard';
import * as Recharts from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC WIDGET LOADER - Loads AI-generated React components at runtime
// ═══════════════════════════════════════════════════════════════════════════

// Loading Skeleton Component
const WidgetSkeleton = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
            <div
                key={i}
                className={`rounded-2xl bg-white/5 border border-white/10 p-6 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="h-3 w-20 rounded bg-white/10" />
                </div>
                <div className="h-8 w-24 rounded bg-white/10 mb-3" />
                <div className="h-16 w-full rounded bg-white/5" />
            </div>
        ))}
    </div>
);

const DynamicWidgetLoader = ({ contextType, children }) => {
    const [WidgetComponent, setWidgetComponent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (contextType) {
            loadWidget(contextType);
        }
    }, [contextType]);

    const loadWidget = async (type) => {
        setLoading(true);
        setError(null);
        try {
            console.log(`[WIDGET] Loading dynamic widget: ${type}`);
            const response = await fetch(`http://localhost:3000/api/widgets/${type.toLowerCase()}?t=${Date.now()}`);

            if (response.ok) {
                const code = await response.text();
                const Component = createComponentFromCode(code);
                if (Component) {
                    console.log(`[WIDGET] ✅ Successfully compiled ${type}`);
                    setWidgetComponent(() => Component);
                } else {
                    setError('Failed to compile widget');
                    setWidgetComponent(null);
                }
            } else {
                console.log(`[WIDGET] No custom widget for ${type}, using default view`);
                setWidgetComponent(null);
            }
        } catch (error) {
            console.warn("Failed to load dynamic widget:", error);
            setError(error.message);
            setWidgetComponent(null);
        }
        setLoading(false);
    };

    const createComponentFromCode = (rawCode) => {
        try {
            // 1. Strip import statements (we inject dependencies directly)
            const cleanCode = rawCode
                .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
                .replace(/export\s+default\s+\w+;?/g, '');

            // 2. Extract component name (heuristic)
            const match = cleanCode.match(/const\s+(\w+)\s*=\s*\(/);
            const componentName = match ? match[1] : 'DynamicComponent';

            // 3. Transpile JSX to JS at Runtime
            let transpiledCode = cleanCode;
            if (window.Babel) {
                try {
                    const result = window.Babel.transform(cleanCode, {
                        presets: ['react'],
                        filename: `${componentName}.jsx`
                    });
                    transpiledCode = result.code;
                } catch (babelErr) {
                    console.error("Babel Transpilation Failed:", babelErr);
                    return null;
                }
            } else {
                console.error("Babel Standalone not found!");
                return null;
            }

            // 4. Icon Library - Beautiful SVG icons for widgets
            const IconLibrary = {
                MapPin: ({ className = "w-6 h-6" }) => (
                    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
                Activity: ({ className = "w-6 h-6" }) => (
                    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                ),
                CheckCircle: ({ className = "w-6 h-6" }) => (
                    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                AlertTriangle: ({ className = "w-6 h-6" }) => (
                    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                ),
                Clock: ({ className = "w-6 h-6" }) => (
                    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                Zap: ({ className = "w-6 h-6" }) => (
                    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                ),
            };

            // 5. Create Function with Dependencies
            // Expose: React, hooks, useDevice, BentoCard, all Recharts components, IconLibrary
            const scope = {
                React,
                useDevice,
                BentoCard,
                ...Recharts,
                // React hooks for generated widgets
                useMemo,
                useCallback,
                useState,
                useEffect,
                // Icon library
                IconLibrary,
            };

            const scopeKeys = Object.keys(scope);
            const scopeValues = Object.values(scope);

            const funcBody = `
                ${transpiledCode}
                return ${componentName};
            `;

            const componentFactory = new Function(...scopeKeys, funcBody);
            return componentFactory(...scopeValues);

        } catch (err) {
            console.error("Dynamic Compilation Failed:", err);
            return null;
        }
    };

    // Show loading skeleton while fetching/compiling widget
    if (loading) {
        return <WidgetSkeleton />;
    }

    // If no widget found, show fallback children (default views)
    if (!WidgetComponent) {
        return children;
    }

    return <WidgetComponent />;
};

export default DynamicWidgetLoader;
