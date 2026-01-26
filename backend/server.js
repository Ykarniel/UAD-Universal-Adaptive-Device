// Backend Compilation Service (Node.js + Express)
// Compiles AI-generated C++ code and serves OTA updates

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Ensure you have dotenv installed

const app = express();
app.use(express.json());

// Initialize Gemini API (Custom REST Proxy to support Gemini 3 / v1beta)
// The official SDK defaults to v1, but we need v1beta for the latest models.
const model = {
    generateContent: async (prompt) => {
        const apiKey = process.env.GEMINI_API_KEY;
        const modelName = 'gemini-2.5-pro'; // User requested specialized high-tier model

        const maxRetries = 3;

        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`[AI] Requesting ${modelName} via REST (Attempt ${i + 1}/${maxRetries})...`);

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                if (response.status === 503) {
                    console.warn(`[AI] ⚠️ Model Overloaded (503). Retrying in ${2 * (i + 1)}s...`);
                    await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Exponentialish backoff
                    continue;
                }

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`Gemini API Error ${response.status}: ${err}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

                // Return object matching SDK structure
                return { response: { text: () => text } };

            } catch (error) {
                console.error(`[AI] Attempt ${i + 1} failed:`, error.message);
                if (i === maxRetries - 1) throw error;
                await new Promise(r => setTimeout(r, 1000)); // Basic wait for other errors
            }
        }
    }
};

// Job tracking
const jobs = new Map();

// Enable CORS Manually (No dependency needed)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ═══════════════════════════════════════════════════════════════════════════
// API: CHECK FOR MODULE UPDATES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/modules/check', (req, res) => {
    const { device_type } = req.query;

    // Check if compiled module exists
    const modulePath = `./compiled_modules/${device_type}_module.bin`;
    const exists = fs.existsSync(modulePath);

    res.json({
        update_available: exists,
        version: '1.0.0',
        device_type: device_type,
        size: exists ? fs.statSync(modulePath).size : 0
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODE LIBRARY API
// ═══════════════════════════════════════════════════════════════════════════

// Load modes database
let modesDatabase = [];
try {
    modesDatabase = JSON.parse(fs.readFileSync('./modes.json', 'utf8'));
    console.log(`[MODES] Loaded ${modesDatabase.length} verified modes`);
} catch (err) {
    console.warn('[MODES] No modes.json found, starting with empty library');
}

// GET all modes
app.get('/api/modes', (req, res) => {
    const { category, featured, search } = req.query;

    let filtered = modesDatabase;

    // Filter by category
    if (category) {
        filtered = filtered.filter(m => m.category === category);
    }

    // Filter by featured
    if (featured === 'true') {
        filtered = filtered.filter(m => m.featured === true);
    }

    // Search by name/description
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(m =>
            m.name.toLowerCase().includes(searchLower) ||
            m.description.toLowerCase().includes(searchLower)
        );
    }

    res.json({
        modes: filtered,
        total: filtered.length,
        categories: ['fitness', 'music', 'home', 'security', 'hobby']
    });
});

// GET specific mode
app.get('/api/modes/:id', (req, res) => {
    const { id } = req.params;
    const mode = modesDatabase.find(m => m.id === id);

    if (!mode) {
        return res.status(404).json({ error: 'Mode not found' });
    }

    res.json(mode);
});

// POST activate mode (switch device to this mode)
app.post('/api/modes/activate', async (req, res) => {
    const { modeId, deviceId } = req.body;

    const mode = modesDatabase.find(m => m.id === modeId);
    if (!mode) {
        return res.status(404).json({ error: 'Mode not found' });
    }

    // Increment download count
    mode.downloads++;
    fs.writeFileSync('./modes.json', JSON.stringify(modesDatabase, null, 2));

    // Check if we have pre-generated code for this mode
    const cpModulePath = `./generated_modules/${mode.smartName}_module.h`;
    const widgetPath = `./generated_widgets/${mode.smartName}_view.jsx`;

    const hasModule = fs.existsSync(cpModulePath);
    const hasWidget = fs.existsSync(widgetPath);

    if (!hasModule || !hasWidget) {
        return res.status(404).json({
            error: 'Mode code not generated yet',
            message: 'This mode needs to be generated first. Contact support.'
        });
    }

    res.json({
        success: true,
        mode: mode,
        message: `Activated ${mode.name} mode`,
        smartName: mode.smartName
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// MY MODES API - Save & Manage Custom Modes
// ═══════════════════════════════════════════════════════════════════════════

// Load my modes database
let myModes = [];
try {
    myModes = JSON.parse(fs.readFileSync('./my_modes.json', 'utf8'));
    console.log(`[MY MODES] Loaded ${myModes.length} saved modes`);
} catch (err) {
    console.warn('[MY MODES] No my_modes.json found, starting fresh');
}

// Helper: Save my modes to disk
function saveMyModes() {
    fs.writeFileSync('./my_modes.json', JSON.stringify(myModes, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════════
// FIRMWARE COMPILATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

async function compileAndFlash(sourceHeaderPath, smartName) {
    const targetPath = path.resolve(__dirname, '../src/current_module.h');
    const backupPath = path.resolve(__dirname, '../src/current_module.h.bak');
    const projectRoot = path.resolve(__dirname, '..'); // PlatformIO Project Root

    console.log(`[BUILD] Starting Build Pipeline for: ${smartName}`);
    console.log(`[BUILD] Source: ${sourceHeaderPath}`);

    // 1. Backup existing module
    let backupCreated = false;
    try {
        if (fs.existsSync(targetPath)) {
            fs.copyFileSync(targetPath, backupPath);
            backupCreated = true;
        }
    } catch (e) {
        console.warn("[BUILD] Backup warning:", e.message);
    }

    try {
        // 2. Inject new code
        const headerContent = fs.readFileSync(sourceHeaderPath, 'utf-8');
        fs.writeFileSync(targetPath, headerContent);

        // 3. Run Compilation (PlatformIO)
        // Command: pio run -e uad_main --slilet
        console.log(`[BUILD] Running PlatformIO in ${projectRoot}...`);

        // Verify platformio installation first?
        // We assume it's in PATH. If not, user might need to adjust.
        // On Windows cmd, 'platformio' or 'pio'
        const buildCmd = 'platformio run -e uad_main';

        await new Promise((resolve, reject) => {
            exec(buildCmd, { cwd: projectRoot }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[BUILD] Error: ${error.message}`);
                    return reject(new Error(stdout || stderr || error.message)); // capture compiler output
                }
                if (stderr && !stderr.includes("Detailed info")) { // PIO outputs success/info on stderr sometimes?
                    // console.warn(`[BUILD] Stderr: ${stderr}`);
                }
                console.log(`[BUILD] Output: ${stdout.substring(stdout.length - 200)}`); // Last 200 chars
                resolve();
            });
        });

        console.log("[BUILD] ✅ Compilation Successful!");

        // 4. (Optional) Auto-Flash if USB device found?
        // API just returns success for now, client triggers OTA via App or assumes local flash
        // Ideally we would move the binary to a 'ready_to_flash' folder

        const builtBin = path.join(projectRoot, '.pio/build/uad_main/firmware.bin');
        const destBin = path.join(__dirname, 'compiled_modules', `${smartName}_firmware.bin`);

        if (fs.existsSync(builtBin)) {
            fs.copyFileSync(builtBin, destBin);
        }

        return { success: true, binPath: destBin };

    } catch (error) {
        console.error("[BUILD] ❌ Compilation Failed!");

        // Restore backup
        if (backupCreated) {
            console.log("[BUILD] Restoring previous module...");
            fs.copyFileSync(backupPath, targetPath);
        }

        throw error;
    }
}

// POST activate mode (switch device to this mode)
app.post('/api/modes/activate', async (req, res) => {
    const { modeId } = req.body; // or smartName if directly calling

    // Special case: "RESET" or "DEFAULT"
    if (modeId === 'default' || modeId === 'reset') {
        const defaultPath = path.resolve(__dirname, '../src/modules/default_bundle.h');
        if (!fs.existsSync(defaultPath)) {
            // Create fallback if missing (or error out)
            return res.status(500).json({ error: 'Default bundle file missing' });
        }

        try {
            await compileAndFlash(defaultPath, 'default');
            return res.json({ success: true, message: "Reset to Default Bundle" });
        } catch (e) {
            return res.status(500).json({ error: "Build Failed", details: e.message });
        }
    }

    // Normal Mode Activation
    const mode = modesDatabase.find(m => m.id === modeId) || myModes.find(m => m.id === modeId);

    // If not found by ID, maybe it's a smartName passed directly?
    let targetSmartName = mode ? mode.smartName : modeId;
    let targetMode = mode;

    // Try finding by smartName if mode object was null
    if (!targetMode) {
        // Attempt lookup in myModes
        targetMode = myModes.find(m => m.smartName === targetSmartName);
    }

    if (!targetSmartName) {
        return res.status(404).json({ error: 'Mode not found' });
    }

    // Find the Generated Header
    const headerPath = path.resolve(__dirname, `generated_modules/${targetSmartName}_module.h`);

    if (!fs.existsSync(headerPath)) {
        return res.status(404).json({
            error: 'Source code not found',
            message: 'This mode has not been generated yet.'
        });
    }

    try {
        const result = await compileAndFlash(headerPath, targetSmartName);

        // Update stats
        if (targetMode) {
            targetMode.activationCount++;
            saveMyModes(); // Assuming safe to call
        }

        res.json({
            success: true,
            smartName: targetSmartName,
            binPath: result.binPath,
            message: `Successfully compiled ${targetSmartName}. Ready to flash.`
        });

    } catch (e) {
        res.status(500).json({
            error: 'Compilation Failed',
            details: "Compiler Error: " + e.message.substring(0, 500)
        });
    }
});

// Helper: Auto-save mode after generation
function autoSaveMode(deviceType, smartName, originalPrompt, cppFile, widgetFile) {
    const existingIndex = myModes.findIndex(m => m.smartName === smartName);
    const id = existingIndex >= 0 ? myModes[existingIndex].id : `mode-${Date.now()}`;

    const modeData = {
        id: id,
        name: deviceType, // Use friendly name
        smartName: smartName,
        originalPrompt: originalPrompt,
        version: existingIndex >= 0 ? myModes[existingIndex].version + 1 : 1,
        status: 'draft',
        createdAt: existingIndex >= 0 ? myModes[existingIndex].createdAt : new Date().toISOString(),
        lastModified: new Date().toISOString(),
        cppFile: cppFile,
        widgetFile: widgetFile,
        activationCount: existingIndex >= 0 ? myModes[existingIndex].activationCount : 0,
        tags: []
    };

    if (existingIndex >= 0) {
        myModes[existingIndex] = modeData;
    } else {
        myModes.push(modeData);
    }

    saveMyModes();
    return modeData;
}

// GET all my modes
app.get('/api/my-modes', (req, res) => {
    const { status, search } = req.query;

    let filtered = myModes.filter(m => m.status !== 'trash'); // Hide trash by default

    if (status) {
        filtered = filtered.filter(m => m.status === status);
    }

    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(m =>
            m.name.toLowerCase().includes(searchLower) ||
            m.originalPrompt?.toLowerCase().includes(searchLower)
        );
    }

    res.json({
        modes: filtered,
        total: filtered.length,
        counts: {
            all: myModes.filter(m => m.status !== 'trash').length,
            drafts: myModes.filter(m => m.status === 'draft').length,
            active: myModes.filter(m => m.status === 'active').length,
            favorites: myModes.filter(m => m.status === 'favorite').length,
            trash: myModes.filter(m => m.status === 'trash').length
        }
    });
});

// GET specific mode
app.get('/api/my-modes/:id', (req, res) => {
    const { id } = req.params;
    const mode = myModes.find(m => m.id === id);

    if (!mode) {
        return res.status(404).json({ error: 'Mode not found' });
    }

    res.json(mode);
});

// PUT update mode (status, favorite, tags)
app.put('/api/my-modes/:id', (req, res) => {
    const { id } = req.params;
    const { status, tags, name } = req.body;

    const modeIndex = myModes.findIndex(m => m.id === id);
    if (modeIndex === -1) {
        return res.status(404).json({ error: 'Mode not found' });
    }

    if (status) myModes[modeIndex].status = status;
    if (tags) myModes[modeIndex].tags = tags;
    if (name) myModes[modeIndex].name = name;
    myModes[modeIndex].lastModified = new Date().toISOString();

    saveMyModes();
    res.json(myModes[modeIndex]);
});

// DELETE mode (move to trash or permanent delete)
app.delete('/api/my-modes/:id', (req, res) => {
    const { id } = req.params;
    const { permanent } = req.query;

    const modeIndex = myModes.findIndex(m => m.id === id);
    if (modeIndex === -1) {
        return res.status(404).json({ error: 'Mode not found' });
    }

    if (permanent === 'true') {
        // Permanent delete
        const deleted = myModes.splice(modeIndex, 1)[0];
        saveMyModes();
        res.json({ success: true, message: `Permanently deleted ${deleted.name}` });
    } else {
        // Move to trash
        myModes[modeIndex].status = 'trash';
        myModes[modeIndex].trashedAt = new Date().toISOString();
        saveMyModes();
        res.json({ success: true, message: `Moved ${myModes[modeIndex].name} to trash` });
    }
});

// POST activate mode
app.post('/api/my-modes/:id/activate', (req, res) => {
    const { id } = req.params;

    const modeIndex = myModes.findIndex(m => m.id === id);
    if (modeIndex === -1) {
        return res.status(404).json({ error: 'Mode not found' });
    }

    // Mark all others as inactive
    myModes.forEach((m, i) => {
        if (i === modeIndex) {
            m.status = m.status === 'favorite' ? 'favorite' : 'active';
            m.activationCount++;
            m.lastActivated = new Date().toISOString();
        } else if (m.status === 'active') {
            m.status = 'draft';
        }
    });

    saveMyModes();
    res.json(myModes[modeIndex]);
});

// ═══════════════════════════════════════════════════════════════════════════
// WIZARD API: Feasibility & Use Cases
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/modes/feasibility', async (req, res) => {
    const { deviceName, purpose, hardware, refinements } = req.body;

    console.log(`[WIZARD] Analyzing feasibility for: ${deviceName}`);

    try {
        const prompt = `
        You are a Senior Embedded Systems Engineer. Analyze if the following project is feasible on an ESP32-S3 with the given hardware.
        
        PROJECT: ${deviceName}
        PURPOSE: ${purpose}
        ${refinements ? `REFINEMENTS: ${refinements}` : ''}
        
        AVAILABLE HARDWARE:
        ${JSON.stringify(hardware, null, 2)}
        
        Analyze constraints:
        1. Sensor availability (e.g. need GPS for tracking?)
        2. Power constraints (Battery vs. USB)
        3. Processing power (TinyML possible?)
        
        Return JSON ONLY:
        {
          "possible": boolean,
          "difficulty": "Easy" | "Medium" | "Hard" | "Impossible",
          "reasoning": "brief explanation",
          "missing_hardware": ["GPS", "Camera"],
          "warnings": ["Battery drain high", "Accuracy low without X"]
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json\n?|\n?```/g, '');
        const json = JSON.parse(text);

        res.json(json);

    } catch (error) {
        console.error("Feasibility Error:", error);
        res.status(500).json({ possible: false, reasoning: "AI Analysis Failed" });
    }
});

app.post('/api/modes/use-cases', async (req, res) => {
    const { deviceName, purpose } = req.body;

    try {
        const prompt = `
        You are a Product Manager. Suggest 3 creative, distinct user stories/use cases for this IoT device.
        
        DEVICE: ${deviceName}
        PURPOSE: ${purpose}
        
        Return JSON ONLY:
        {
          "use_cases": [
            { "title": "...", "description": "...", "icon": "..." },
            { "title": "...", "description": "...", "icon": "..." },
            { "title": "...", "description": "...", "icon": "..." }
          ]
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json\n?|\n?```/g, '');
        const json = JSON.parse(text);

        res.json(json);

    } catch (error) {
        console.error("Use Case Error:", error);
        res.status(500).json({ use_cases: [] });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// API: GENERATE MODULE (AI-powered)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/modules/generate', async (req, res) => {
    const { device_type, features, hardware_profile, user_profile } = req.body;
    const jobId = Date.now().toString();

    // Start generation job
    jobs.set(jobId, { status: 'generating', device_type });

    res.json({ success: true, job_id: jobId });

    // Run async generation
    generateModule(jobId, device_type, features, hardware_profile, user_profile);
});

async function generateModule(jobId, deviceType, features, hardware_profile, user_profile) {
    try {
        console.log(`[JOB ${jobId}] Generating ${deviceType} module...`);

        // Smart naming: "guitar helper" -> "tuner"
        const smartName = generateSmartName(deviceType);
        const safeType = capitalize(smartName);
        const className = `${safeType}Module`;

        // ───────────────────────────────────────────────────────────────────────
        // Step 1: Generate C++ code via Gemini (Corrected SDK Usage)
        // ───────────────────────────────────────────────────────────────────────

        const prompt = `
You are an expert embedded systems engineer. Generate a production-quality C++ module for ESP32-S3 that implements a ${deviceType} tracker.

═══════════════════════════════════════════════════════════════════════════════
HARDWARE PROFILE (Available sensors and actuators)
═══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(hardware_profile, null, 2)}

═══════════════════════════════════════════════════════════════════════════════
REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
1. **State Machine Architecture**: Implement a clean FSM with states like IDLE, ACTIVE, ALERT, LOW_POWER
2. **Power Efficiency**: 
   - Use configurable polling intervals (fast when active, slow when idle)
   - Implement adaptive transmission logic based on state changes
   - Support deep sleep transitions
3. **Smart Data Processing (TinyML / Edge Computing)**:
   - **Never send raw noisy data** directly to the phone (saves bandwidth & battery).
   - **Signal Smoothing**: Apply EMA (Exponential Moving Average) or Kalman filters to all analog inputs.
   - **Feature Extraction**: Calculate meaningful stats on-device (e.g., instead of raw accel, calculate 'motion_intensity' or 'step_count').
   - **Smart Transmission**: Only transmit when values change significantly (delta threshold) or on critical events.
   - **Local Intelligence**: Detect states locally (e.g., if(temp > 30) state = OVERHEAT) rather than waiting for the app.
4. **Error Handling**:
   - Handle GPS signal loss gracefully (use last known good position)
   - Detect IMU disconnection or malfunction
   - Log errors to Serial for debugging
5. **Feature Set**: ${JSON.stringify(features)}

═══════════════════════════════════════════════════════════════════════════════
DISPLAY CAPABILITIES (Global 'display' object is available)
═══════════════════════════════════════════════════════════════════════════════
You have access to a global \`DisplayManager display;\`. 
Use these methods to visualize data (do not implement the driver yourself):

- \`display.showStatus(String title, String status, int iconIndex)\`: Simple status screen
- \`display.drawGraph(float value, float min, float max)\`: Scrolling live waveform
- \`display.showProgressBar(String label, int percent)\`: Progress/Battery bar
- \`display.showIcon(int iconIndex)\`: 0=Check, 1=Cross, 2=Warn, 3=Wifi, 4=Music
- \`display.clear()\` and \`display.update()\`: Manual control

**MANDATORY**: In your \`update()\` loop, you MUST call one of these to show feedback to the user.
If the device is a "${deviceType}", what is the coolest visualization? 
- Guitar Tuner? -> drawGraph (waveform)
- Security? -> showStatus("GUARD", "ARMED", 0)
- Level? -> showProgressBar("TILT", angle)

═══════════════════════════════════════════════════════════════════════════════
REQUIRED INTERFACE (Implement exactly this structure)
═══════════════════════════════════════════════════════════════════════════════
\`\`\`cpp
#ifndef ${safeType.toUpperCase()}_MODULE_H
#define ${safeType.toUpperCase()}_MODULE_H

#include "../include/types.h"
#include <Arduino.h>

// State Machine States
enum class ${className}State {
    IDLE,
    ACTIVE, 
    MONITORING,
    ALERT,
    LOW_POWER
};

class ${className} {
private:
    ${className}State currentState = ${className}State::IDLE;
    
    // Timing
    uint32_t lastSampleMs = 0;
    uint32_t lastTransmitMs = 0;
    static constexpr uint32_t SAMPLE_INTERVAL_ACTIVE = 100;   // 10 Hz when active
    static constexpr uint32_t SAMPLE_INTERVAL_IDLE = 1000;    // 1 Hz when idle
    static constexpr uint32_t TRANSMIT_INTERVAL = 5000;       // 5s telemetry
    
    // Sensor filters (EMA)
    float filterAlpha = 0.2f;
    float filteredValue = 0.0f;
    
    // Last known good values
    float lastGoodLat = 0.0f;
    float lastGoodLon = 0.0f;
    
    // Helper methods
    float applyEMAFilter(float newValue);
    bool validateSensorRange(float value, float min, float max);
    void transitionState(${className}State newState);
    
public:
    void init() {
        Serial.println("[MODULE] ${deviceType.toUpperCase()} mode activated");
        // Initialize pins, sensors, set initial state
    }
    
    void update(const SensorData& data) {
        // 1. Apply filtering to raw sensor data
        // 2. Run state machine logic
        // 3. Detect ${deviceType}-specific events
        // 4. Update internal state
    }
    
    TelemetryData getTelemetry() {
        TelemetryData telemetry;
        // Encode current state, filtered sensor values, GPS, battery
        return telemetry;
    }
    
    void handleAlert() {
        // Immediate action: LED flash, buzzer, send priority message
    }
    
    // Debug print
    void printDebug() {
        Serial.printf("State: %d Val: %.2f\n", (int)currentState, filteredValue);
    }
};

#endif
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
TINYML / AI CAPABILITIES (TensorFlow Lite Micro)
═══════════════════════════════════════════════════════════════════════════════
You may include \`<TensorFlowLite_ESP32.h>\` if complex pattern recognition is needed.
- If the user asks for "Gesture Recognition" or "Voice classification", generate the TFLite boilerplate.
- Define a \`const unsigned char model_data[]\` with a placeholder comment: 
  \`// ... [USER MUST PASTE TFLITE MODEL HEX HERE] ...\`
- Example inputs: IMU (Accel/Gyro), Microphone (Audio Buffer).
- Use \`tflite::MicroInterpreter\` to run inference.
- **IMPORTANT**: If using TFLite, use \`display.showStatus("AI MODE", "THINKING...", 0)\` during inference.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT RULES
═══════════════════════════════════════════════════════════════════════════════
- Return ONLY valid, compilable C++ code
- Include all #include statements needed
- Add brief comments explaining ${deviceType}-specific logic
- NO markdown, NO explanations, just code
`;

        // ... (Prompt generation remains same)
        console.log(`[JOB ${jobId}] Requesting Gemini generation...`);

        // --- FIXED: Using the SDK instead of manual fetch ---
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let cppCode = response.text();

        // Clean up Markdown formatting if present
        cppCode = cppCode.replace(/```cpp\n?/g, '').replace(/```\n?/g, '');

        // ───────────────────────────────────────────────────────────────────────
        // Step 1.5: Verify and Fix C++ Code (Self-Healing)
        // ───────────────────────────────────────────────────────────────────────
        console.log(`[JOB ${jobId}] Verifying C++ code...`);
        const fixedCppCode = await verifyAndFixCPP(cppCode, className);

        console.log(`[JOB ${jobId}] Generated ${fixedCppCode.length} bytes of verified C++ code`);

        // Save generated code with smart name
        const modulePath = `./generated_modules/${smartName}_module.h`;
        fs.writeFileSync(modulePath, fixedCppCode);

        // Update Job Status
        jobs.set(jobId, { status: 'compiling', device_type: deviceType, smart_name: smartName });

        // ───────────────────────────────────────────────────────────────────────
        // Step 2: Simulate Compilation (In real app, you would run PlatformIO here)
        // ───────────────────────────────────────────────────────────────────────

        // Simulating compilation delay
        setTimeout(() => {
            // Mock creating a binary file with smart name
            const binPath = `./compiled_modules/${smartName}_module.bin`;
            fs.writeFileSync(binPath, "BINARY_DATA_PLACEHOLDER");

            jobs.set(jobId, { status: 'completed', path: binPath, smart_name: smartName });
            console.log(`[JOB ${jobId}] Compilation finished.`);
        }, 2000);

    } catch (error) {
        console.error(`[JOB ${jobId}] Error:`, error);
        jobs.set(jobId, { status: 'failed', error: error.message });
    }
}

// Helper: Verify C++ Code
async function verifyAndFixCPP(code, className) {
    const errorCheckPrompt = `
    Review the following C++ code for CRITICAL compilation errors (ESP32 / Arduino environment).
    
    CODE:
    ${code.substring(0, 15000)} // Truncate if too long
    
    CHECKLIST:
    1. Are there missing semicolons or brackets?
    2. Is the class name exactly '${className}'?
    3. Are there undefined variables or types?
    4. Are there infinite loops in 'update()'?
    5. Does it implement the 'getTelemetry()' method correctly?
    
    INSTRUCTION:
    - If errors exist, FIX them and return the clean code.
    - If code is perfect, return it exactly as is.
    - Return ONLY valid C++ code. No markdown.
    `;

    try {
        const result = await model.generateContent(errorCheckPrompt);
        let fixed = result.response.text().replace(/```cpp\n?|```c\n?|```\n?/g, '');
        return fixed;
    } catch (e) {
        console.error("CPP Verification failed, returning original:", e);
        return code;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// API: CHECK JOB STATUS
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/modules/status', (req, res) => {
    const { job_id } = req.query;
    const job = jobs.get(job_id);

    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }

    res.json(job);
});

// ═══════════════════════════════════════════════════════════════════════════
// API: DOWNLOAD MODULE
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/modules/download', (req, res) => {
    const { device_type } = req.query;
    const modulePath = `./compiled_modules/${device_type}_module.bin`;

    if (!fs.existsSync(modulePath)) {
        res.status(404).json({ error: 'Module not found' });
        return;
    }

    res.sendFile(path.resolve(modulePath));
});

// ═══════════════════════════════════════════════════════════════════════════
// API: GET WIDGET (Serve compiled JSX)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/widgets/:type', (req, res) => {
    const { type } = req.params;
    const decodedType = decodeURIComponent(type);

    // Use absolute paths to be safe on Windows
    const widgetDir = path.join(__dirname, 'generated_widgets');

    // Try formatted name first: "gps asset tracker" -> "GPS asset tracker_view.jsx"
    // Files are saved as "${device_type}_view.jsx" in /api/widgets/generate

    const possibleFiles = [
        `${decodedType}_view.jsx`,
        `${decodedType.toLowerCase()}_view.jsx`,
        // Try to find it in the directory case-insensitively
    ];

    for (const file of possibleFiles) {
        const fullPath = path.join(widgetDir, file);
        if (fs.existsSync(fullPath)) {
            return res.sendFile(fullPath);
        }
    }

    // fallback: list directory and find best match
    try {
        const files = fs.readdirSync(widgetDir);
        const match = files.find(f => f.toLowerCase() === `${decodedType.toLowerCase()}_view.jsx`);
        if (match) {
            return res.sendFile(path.join(widgetDir, match));
        }
    } catch (e) {
        console.error("Error reading widget directory:", e);
    }

    res.status(404).json({ error: 'Widget not found', requested: decodedType });
});

// ═══════════════════════════════════════════════════════════════════════════
// API: PARAMETER TUNER (Parse & Edit C++)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/modes/:smartName/parameters', (req, res) => {
    const { smartName } = req.params;
    const filePath = path.join(__dirname, 'generated_modules', `${smartName}_module.h`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Module file not found' });
    }

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const params = [];

        // Regex to find #define PARAMS
        // Matches: #define SENSITIVITY 0.5 or #define ALARM_TIMEOUT 5000
        const defineRegex = /#define\s+([A-Z_][A-Z0-9_]*)\s+([-+]?[0-9]*\.?[0-9]+f?)/g;
        let match;
        while ((match = defineRegex.exec(content)) !== null) {
            params.push({
                type: 'define',
                name: match[1],
                value: match[2],
                line: match[0]
            });
        }

        // Regex to find const/constexpr PARAMS
        // Matches: static constexpr uint32_t INTERVAL = 1000;
        const constRegex = /(?:static\s+)?(?:constexpr|const)\s+(?:float|int|uint32_t|double)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([-+]?[0-9]*\.?[0-9]+f?);/g;
        while ((match = constRegex.exec(content)) !== null) {
            params.push({
                type: 'const',
                name: match[1],
                value: match[2],
                line: match[0]
            });
        }

        res.json(params);
    } catch (e) {
        console.error("Error parsing params:", e);
        res.status(500).json({ error: 'Failed to parse parameters' });
    }
});

app.post('/api/modes/:smartName/parameters', async (req, res) => {
    const { smartName } = req.params;
    const { updates } = req.body; // { "SENSITIVITY": "0.8", "INTERVAL": "500" }
    const filePath = path.join(__dirname, 'generated_modules', `${smartName}_module.h`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Module file not found' });
    }

    try {
        let content = fs.readFileSync(filePath, 'utf-8');

        Object.keys(updates).forEach(paramName => {
            const newValue = updates[paramName];

            // Update #define
            // Look for #define PARAM_NAME old_value
            const defineRegex = new RegExp(`(#define\\s+${paramName}\\s+)([-+]?[0-9]*\\.?[0-9]+f?)`, 'g');
            if (defineRegex.test(content)) {
                content = content.replace(defineRegex, `$1${newValue}`);
            }

            // Update const/constexpr
            // Look for type PARAM_NAME = old_value;
            const constRegex = new RegExp(`((?:constexpr|const)\\s+(?:float|int|uint32_t|double)\\s+${paramName}\\s*=\\s*)([-+]?[0-9]*\\.?[0-9]+f?)`, 'g');
            if (constRegex.test(content)) {
                content = content.replace(constRegex, `$1${newValue}`);
            }
        });

        fs.writeFileSync(filePath, content);
        console.log(`[TUNER] Updated parameters for ${smartName}`);

        // Trigger Re-compile (Mock)
        const jobId = Date.now().toString();
        jobs.set(jobId, { status: 'compiling', device_type: smartName, smart_name: smartName });

        setTimeout(() => {
            // Mock creating binary
            const binPath = `./compiled_modules/${smartName}_module.bin`;
            fs.writeFileSync(binPath, "UPDATED_BINARY_DATA");
            jobs.set(jobId, { status: 'completed', path: binPath, smart_name: smartName });
        }, 1500);

        res.json({ success: true, message: 'Parameters updated & compiling', job_id: jobId });

    } catch (e) {
        console.error("Error updating params:", e);
        res.status(500).json({ error: 'Failed to update parameters' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// API: GENERATE WIDGET (React JSX)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/widgets/generate', async (req, res) => {
    const { device_type, description, data_fields, hardware_profile, user_profile } = req.body;

    // Smart naming: "guitar helper" -> "tuner"
    const smartName = generateSmartName(device_type);
    const safeType = capitalize(smartName);
    const componentName = `${safeType}View`;

    // Read Tailwind Config
    let tailwindConfig = "No custom config found.";
    try {
        const configPath = path.resolve(__dirname, '../dashboard/tailwind.config.js');
        if (fs.existsSync(configPath)) {
            tailwindConfig = fs.readFileSync(configPath, 'utf-8');
        }
    } catch (e) {
        console.warn("Could not read tailwind config:", e);
    }

    try {
        const prompt = `
            You are an elite UI/UX engineer specializing in premium dashboard widgets. Generate a stunning React component for a ${device_type} dashboard.
            
            CONTEXT:
            - Device: ${device_type}
            - Description: ${description || "Standard Dashboard"}
            
            ⭐⭐⭐ PROJECT TAILWIND CONFIGURATION (STRICTLY ADHERE TO THIS) ⭐⭐⭐
            ${tailwindConfig}
            
            DESIGN RULES:
            - Use the custom colors defined above (e.g. text-helmet-primary, bg-helmet-background) if available.

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE DATA (from useDevice hook)
═══════════════════════════════════════════════════════════════════════════════
const { deviceData, telemetryHistory } = useDevice();
- deviceData: { sensorValue, status, latitude, longitude, ts, batteryPercent, rssi, contextName }
- telemetryHistory: Array of past deviceData readings for charts

Data fields specific to ${device_type}: ${data_fields.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
DESIGN SYSTEM (MUST USE)
═══════════════════════════════════════════════════════════════════════════════

1. **Glassmorphism Cards** (Mandatory):
   - Background: bg-white/5 or bg-gradient-to-br from-white/10 to-white/5
   - Border: border border-white/10
   - Blur: backdrop-blur-xl (use sparingly)
   - Rounded corners: rounded-2xl or rounded-3xl
   - Shadows: shadow-xl shadow-black/20

2. **Color Palette** (Premium HSL colors, NOT basic red/blue/green):
   - Primary Accent: hsl(200, 80%, 60%) - Cyan glow
   - Success: hsl(160, 70%, 50%) - Emerald
   - Warning: hsl(35, 90%, 55%) - Amber
   - Danger: hsl(350, 80%, 55%) - Rose
   - Purple accent: hsl(270, 70%, 60%)
   - Use gradients: bg-gradient-to-r from-cyan-500 to-blue-600

3. **Typography**:
   - Large metrics: text-4xl md:text-5xl font-bold tracking-tight
   - Labels: text-xs uppercase tracking-widest text-white/60
   - Values: text-white font-semibold

4. **Micro-animations** (CSS only, NO framer-motion):
   - Pulse: animate-pulse for live indicators
   - Fade in: animate-[fadeIn_0.5s_ease-out]
   - Transitions: transition-all duration-300

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE COMPONENTS & HOOKS
═══════════════════════════════════════════════════════════════════════════════

✅ ALLOWED (These are injected into scope):
- React hooks: useState, useEffect, useMemo, useCallback
- BentoCard: <BentoCard title="" value="" unit="" icon="" color="blue|green|purple|orange|red|gray" size="sm|md|lg|full">{children}</BentoCard>
- Recharts: AreaChart, LineChart, BarChart, PieChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
- IconLibrary: Pre-made SVG icons (MapPin, Activity, CheckCircle, AlertTriangle, Clock, Zap)
  Usage: <IconLibrary.MapPin className="w-6 h-6 text-blue-500" />
- Native HTML/SVG for custom visualizations
- OpenStreetMap embed: <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=...&layer=mapnik" />

❌❌❌ ABSOLUTELY FORBIDDEN (WILL CRASH THE APP) ❌❌❌
DO NOT IMPORT ANY OF THESE - THEY ARE NOT AVAILABLE:
- lucide-react (MapPin, CheckCircle, Activity, etc.)
- react-icons (FaIcon, MdIcon, etc.) 
- framer-motion (motion.div, AnimatePresence, etc.)
- @heroicons/react
- Any other external npm packages

⚠️ IF YOU USE ANY FORBIDDEN IMPORTS, THE WIDGET WILL SHOW A BLACK SCREEN!

Instead of icon libraries, use:
- Emoji icons: 🎸 🏃 🌡️ 📍 ⚡ 🔋 ⚠️ ✅ ❌
- Inline SVG: <svg>...</svg>
- Unicode symbols: ▲ ● ■ ★

═══════════════════════════════════════════════════════════════════════════════
PROFESSIONAL WIDGET TEMPLATE (Follow this structure exactly!)
═══════════════════════════════════════════════════════════════════════════════

**Component Name: ${componentName}**

This template shows ALL the patterns you can use. Pick the relevant ones for ${device_type}.

\`\`\`jsx
import React, { useMemo } from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import BentoCard from '../BentoCard';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

// ❌ DO NOT ADD: import { MapPin } from 'lucide-react';  <- WILL CRASH!
// ✅ Instead use: IconLibrary.MapPin or emoji 📍

const ${componentName} = () => {
  const { deviceData, telemetryHistory } = useDevice();
  
  // ═══════════════════════════════════════════════════════════════════
  // DATA PROCESSING (Always handle null/empty gracefully!)
  // ═══════════════════════════════════════════════════════════════════
  
  const chartData = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return Array.from({ length: 10 }, (_, i) => ({ time: i, value: 0 }));
    }
    return telemetryHistory.slice(-20).map((item, i) => ({
      time: new Date(item.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: item.sensorValue ?? 0,
      battery: item.batteryPercent ?? 100,
    }));
  }, [telemetryHistory]);
  
  // Extract metrics with null-safe fallbacks
  const mainValue = deviceData?.sensorValue ?? 0;
  const batteryLevel = deviceData?.batteryPercent ?? 100;
  const latitude = deviceData?.latitude ?? 32.0853;
  const longitude = deviceData?.longitude ?? 34.7818;
  const isActive = (deviceData?.status ?? 0) === 0;
  
  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl bg-black/80 backdrop-blur-md border border-white/20 p-3 shadow-2xl">
          <p className="text-xs text-white/70">{payload[0].payload.time}</p>
          <p className="text-sm font-bold text-cyan-300">{payload[0].value.toFixed(1)}</p>
        </div>
      );
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: Premium Glassmorphism Bento Grid Layout
  // ═══════════════════════════════════════════════════════════════════
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-2">
      
      {/* ===== HERO CARD: Main Metric with Gradient & Chart ===== */}
      <div className="col-span-2 row-span-2 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-purple-600/20 border border-white/20 p-6 shadow-2xl flex flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
              <IconLibrary.Activity className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50 font-semibold">Primary Metric</p>
              <p className="text-4xl md:text-5xl font-bold text-white mt-1">{mainValue.toFixed(1)}</p>
            </div>
          </div>
          <div className={\`px-4 py-2 rounded-full backdrop-blur-md border \${isActive ? 'bg-green-500/20 border-green-400/30' : 'bg-gray-500/20 border-gray-400/30'}\`}>
            <span className={\`text-xs font-bold \${isActive ? 'text-green-300' : 'text-gray-300'}\`}>
              {isActive ? '● ACTIVE' : '● IDLE'}
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="hsl(190, 90%, 60%)" strokeWidth={3} fill="url(#gradientArea)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* ===== MAP CARD: GPS Location (if applicable) ===== */}
      <div className="col-span-2 row-span-2 rounded-3xl bg-gradient-to-br from-white/5 to-black/20 border border-white/10 p-5 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <IconLibrary.MapPin className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-white/90 uppercase tracking-wide">Live Location</h3>
        </div>
        <div className="w-full h-full min-h-[250px] rounded-2xl overflow-hidden border-2 border-white/10">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src={\`https://www.openstreetmap.org/export/embed.html?bbox=\${longitude-0.01},\${latitude-0.01},\${longitude+0.01},\${latitude+0.01}&layer=mapnik&marker=\${latitude},\${longitude}\`}
            className="w-full h-full"
            title="Device Location"
          />
        </div>
        <p className="text-xs text-white/40 mt-2">📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
      </div>
      
      {/* ===== METRIC CARDS: Use BentoCard for consistency ===== */}
      <BentoCard 
        title="Battery" 
        value={batteryLevel} 
        unit="%" 
        icon="🔋" 
        color={batteryLevel > 20 ? "green" : "red"} 
        size="sm" 
      />
      
      <BentoCard 
        title="Signal" 
        value={deviceData?.rssi ?? -50} 
        unit="dB" 
        icon="�" 
        color="blue" 
        size="sm" 
      />
      
      {/* ===== CHART VARIATIONS: Bar Chart Example ===== */}
      <div className="col-span-2 rounded-3xl bg-gradient-to-br from-white/5 to-black/20 border border-white/10 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📊</span>
          <h3 className="text-sm font-bold text-white/90 uppercase tracking-wide">History</h3>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData.slice(-8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} />
            <Bar dataKey="value" fill="hsl(160, 70%, 50%)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ${componentName};
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
REQUIREMENTS FOR ${device_type}
═══════════════════════════════════════════════════════════════════════════════

Adapt the template above for ${device_type}:
- Choose relevant metrics to display prominently
- Use appropriate icons (emoji or IconLibrary)
- Include GPS map ONLY if ${device_type} tracks location
- Pick chart types that make sense (Area for trends, Bar for comparisons)
- Use colors that match the device purpose (green for plants, blue for water, etc.)
- Make it STUNNING with gradients and glassmorphism!

═══════════════════════════════════════════════════════════════════════════════
SPECIFIC REQUIREMENTS FOR: ${device_type}
═══════════════════════════════════════════════════════════════════════════════

Create widgets that are USEFUL and BEAUTIFUL for a ${device_type}. Think about:
- What metrics matter most? Display them prominently.
- What visualizations help the user understand the data?
- If GPS-related: Include a map (OpenStreetMap iframe or SVG visualization)
- Add contextual icons using emoji (🎸 🏃 🌡️ 📍 etc.)
- Make it feel PREMIUM - this is a showcase product!

═══════════════════════════════════════════════════════════════════════════════
OUTPUT RULES
═══════════════════════════════════════════════════════════════════════════════
- Return ONLY valid JSX code
- NO markdown code fences in output
- NO explanations or comments outside the code
- Component MUST handle empty/null data gracefully
- MUST work with the injected scope (React, useDevice, BentoCard, Recharts)
`;

        const result = await model.generateContent(prompt);
        // My Proxy returns { response: { text: () => text } }
        let jsxCode = result.response.text().replace(/```jsx\n?/g, '').replace(/```\n?/g, '');

        // ═══════════════════════════════════════════════════════════════════
        // SAFETY NET: Strip forbidden imports that will crash at runtime
        // ═══════════════════════════════════════════════════════════════════
        const forbiddenImports = [
            'lucide-react',
            'framer-motion',
            'react-icons',
            '@heroicons/react',
            'phosphor-react',
            'react-feather'
        ];

        let hadForbiddenImports = false;
        forbiddenImports.forEach(lib => {
            const importRegex = new RegExp(`import\\s+.*?from\\s+['"]${lib}['"];?`, 'g');
            if (importRegex.test(jsxCode)) {
                console.warn(`[WIDGET] ⚠️ Stripped forbidden import: ${lib}`);
                jsxCode = jsxCode.replace(importRegex, `// ❌ REMOVED: import from '${lib}' (not available at runtime)`);
                hadForbiddenImports = true;
            }
        });

        if (hadForbiddenImports) {
            console.log('[WIDGET] 🔧 Auto-fixed generated code by removing forbidden imports');
        }

        // Save widget with smart name
        const widgetPath = `./generated_widgets/${smartName}_view.jsx`;
        fs.writeFileSync(widgetPath, jsxCode);

        // AUTO-SAVE to My Modes Library
        const savedMode = autoSaveMode(
            device_type,
            smartName,
            req.body.description || "Custom mode generated by AI",
            `generated_modules/${smartName}_module.h`,
            `generated_widgets/${smartName}_view.jsx`
        );
        console.log(`[MY MODES] Auto-saved new mode: ${smartName}`);

        res.json({
            success: true,
            smart_name: smartName,
            widget_path: widgetPath,
            saved_mode: savedMode
        });


    } catch (error) {
        console.error("Widget Gen Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert user input into a smart, short device name
 * "guitar helper" -> "tuner"
 * "running buddy" -> "runner"  
 * "weather station" -> "weather"
 * "GPS asset tracker" -> "tracker"
 */
function generateSmartName(userInput) {
    const input = userInput.toLowerCase().trim();

    // Expanded keyword map for common patterns - prioritize specific concepts
    const keywordMap = {
        // Music
        'guitar': 'tuner',
        'piano': 'piano',
        'tuner': 'tuner',
        'music': 'music',

        // Fitness
        'running': 'runner',
        'run': 'runner',
        'cycling': 'cyclist',
        'bike': 'cyclist',
        'bicycle': 'cyclist',
        'fitness': 'fitness',
        'workout': 'fitness',
        'gym': 'gym',
        'dumbbell': 'lifter',
        'weight': 'lifter',
        'sleep': 'sleep',

        // Tracking
        'gps': 'tracker',
        'asset': 'tracker',
        'tracker': 'tracker',
        'location': 'tracker',
        'parking': 'parking',

        // Vehicles
        'car': 'vehicle',
        'vehicle': 'vehicle',

        // Safety
        'helmet': 'helmet',
        'safety': 'safety',

        // Home
        'door': 'door',
        'window': 'window',
        'bathroom': 'bath',
        'kitchen': 'kitchen',
        'room': 'room',

        // Nature
        'plant': 'plant',
        'garden': 'garden',
        'water': 'hydration',
        'weather': 'weather',
        'temperature': 'weather',
        'climate': 'weather',

        // Pets
        'dog': 'pet',
        'pet': 'pet',
        'cat': 'pet',
        'animal': 'animal',
    };

    // Check for keyword matches (most specific first)
    for (const [keyword, shortName] of Object.entries(keywordMap)) {
        if (input.includes(keyword)) {
            return shortName;
        }
    }

    // Filter out filler words and get meaningful words
    const fillerWords = ['the', 'a', 'an', 'my', 'your', 'buddy', 'helper', 'assistant',
        'tracker', 'monitor', 'sensor', 'detector', 'indicator', 'device'];

    const words = input.split(/\s+/).filter(w =>
        w.length > 2 && !fillerWords.includes(w)
    );

    // Prioritize the LAST meaningful word (e.g., "bathroom door" -> "door")
    if (words.length > 0) {
        const lastWord = words[words.length - 1];
        return lastWord.substring(0, 8); // Shorter max (8 chars)
    }

    // Last resort: sanitize and truncate
    const sanitized = input.replace(/[^a-z0-9]/g, '');
    return sanitized.substring(0, 8);
}

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

// Create directories
['./generated_modules', './compiled_modules', './generated_widgets'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.listen(PORT, () => {
    console.log(`🚀 UAD Backend running on port ${PORT}`);
    console.log(`📁 Generated modules: ./generated_modules`);
    console.log(`📦 Compiled binaries: ./compiled_modules`);
    console.log(`🎨 Generated widgets: ./generated_widgets`);
});