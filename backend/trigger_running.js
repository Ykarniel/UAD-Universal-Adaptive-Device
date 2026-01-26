const http = require('http');

const data = JSON.stringify({
    feature_name: "running_buddy",
    widget_type: "gauge",
    data_field: "pacing_accuracy",
    description: "Shows how close you are to your target cadence"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/widgets/auto-generate',
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
