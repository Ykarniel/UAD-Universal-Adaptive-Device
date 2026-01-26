const fs = require('fs');

module.exports = function (app, model) {
    // Auto-widget generation endpoint for autonomously discovered features
    app.post('/api/widgets/auto-generate', async (req, res) => {
        const { feature_name, widget_type, data_field, description } = req.body;

        console.log(`[AUTO-WIDGET] Generating for discovered feature: ${feature_name}`);

        try {
            // Build prompt for Gemini
            const prompt = `
Generate a beautiful React component for this autonomously discovered feature:

Feature Name: ${feature_name}
Widget Type: ${widget_type} (gauge, chart, counter, timeline, alert)
Data Field: ${data_field}
Description: ${description}

Requirements:
1. Use Tailwind CSS for styling (make it BEAUTIFUL with gradients, shadows, dark mode compatible)
2. Use Recharts if widget_type is "chart"
3. Access data via: const { deviceData, telemetryHistory } = useDevice();
4. The data field is: deviceData.${data_field}
5. Show trends, insights, and helpful information
6. Use appropriate icons and visual metaphors
7. Make it responsive (mobile-friendly)
8. Add subtle animations for engagement

Return ONLY valid JSX code for the component, NO explanation.
Component name: ${capitalize(feature_name)}Widget

Example structure:
\`\`\`jsx
import React from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import { LineChart, Line } from 'recharts';

const ${capitalize(feature_name)}Widget = () => {
    const { deviceData, telemetryHistory } = useDevice();
    const value = deviceData.${data_field} || 0;
    
    return (
    <div className="p-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
        <h3 className="text-white text-lg font-bold mb-2">${feature_name}</h3>
        <div className="text-6xl font-bold text-white">{value}</div>
        <p className="text-white/70 text-sm mt-4">${description}</p>
    </div>
    );
};

export default ${capitalize(feature_name)}Widget;
\`\`\`
            `;

            // DIRECT REST API CALL (Like FlyCard)
            // This bypasses Node SDK authentication specificities that might conflict with this key
            const apiKey = process.env.GEMINI_API_KEY;
            const modelName = 'gemini-1.5-pro';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            console.log(`[AUTO-WIDGET] Requesting ${modelName}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const jsx_code = data.candidates[0].content.parts[0].text;

            // Clean up code (remove markdown backticks if present)
            const clean_code = jsx_code.replace(/```jsx\n?/g, '').replace(/```\n?/g, '');

            // Save widget
            const widgetPath = `./generated_widgets/${feature_name}_widget.jsx`;
            fs.writeFileSync(widgetPath, clean_code);

            console.log(`[AUTO-WIDGET] ✅ Generated and saved: ${widgetPath}`);

            res.json({
                success: true,
                code: clean_code,
                path: widgetPath,
                feature_name: feature_name
            });

        } catch (error) {
            console.error(`[AUTO-WIDGET] ❌ AI Generation failed:`, error.message);
            console.log(`[AUTO-WIDGET] ⚠️ Falling back to template generation...`);

            // Fallback Template
            const clean_code = `import React from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import BentoCard from '../BentoCard';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const ${capitalize(feature_name)}Widget = () => {
    const { deviceData, telemetryHistory } = useDevice();
    // Fallback data simulation using hash of feature name to stay consistent
    const seed = ${feature_name.length}; 
    const value = Math.floor(deviceData.sensorValue) || (100 + seed);
    
    // Simulate some history data
    const chartData = telemetryHistory.slice(-20).map((d, i) => ({
        time: i,
        value: 100 + Math.sin(i + seed) * 20
    }));

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
            <div className="col-span-full mb-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    ✨ ${capitalize(feature_name).replace(/_/g, ' ')} Mode
                </h2>
                <p className="text-gray-400 text-sm">Autonomously generated via Fallback Protocol</p>
            </div>
            
            <BentoCard 
                title="${capitalize(data_field || 'Metric').replace(/_/g, ' ')}" 
                value={value} 
                unit="units"
                color="blue"
                icon="⚡"
                size="lg"
            >
                <div className="mt-4 h-24 -mx-2">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                             <Area type="monotone" dataKey="value" stroke="#3B82F6" fillOpacity={0.2} fill="#3B82F6" />
                        </AreaChart>
                     </ResponsiveContainer>
                </div>
            </BentoCard>

            <BentoCard icon="🤖" title="AI Confidence" value="98%" color="green" size="md" />
            <BentoCard icon="📝" title="Description" size="full" color="gray">
                <div className="p-2 text-sm text-gray-300">"${description || 'Generated widget'}"</div>
            </BentoCard>
        </div>
    );
};

export default ${capitalize(feature_name)}Widget;`;

            // Save widget
            const widgetPath = `./generated_widgets/${feature_name}_widget.jsx`;
            fs.writeFileSync(widgetPath, clean_code);
            console.log(`[AUTO-WIDGET] ✅ Generated (Fallback) and saved: ${widgetPath}`);

            res.json({
                success: true,
                code: clean_code,
                path: widgetPath,
                feature_name: feature_name,
                fallback: true
            });
        }
    });

    // Endpoint to get generated widget code
    app.get('/api/widgets/:feature_name', (req, res) => {
        const { feature_name } = req.params;
        const widgetPath = `./generated_widgets/${feature_name}_widget.jsx`;

        if (fs.existsSync(widgetPath)) {
            const code = fs.readFileSync(widgetPath, 'utf8');
            res.type('text/javascript').send(code);
        } else {
            res.status(404).json({ error: 'Widget not found' });
        }
    });

    function capitalize(str) {
        return str.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
    }
};
