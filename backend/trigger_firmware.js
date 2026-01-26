const http = require('http');

const data = JSON.stringify({
    device_type: "running_buddy",
    features: ["step_counting", "fatigue_detection", "cadence_tracking", "impact_safety"]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/modules/generate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log('Response:', body));
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
