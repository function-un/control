const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static UI assets from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket network pipeline
wss.on('connection', (ws) => {
    console.log('New network endpoint connected to ConnectWise relay.');

    ws.on('message', (message) => {
        // Broadcast incoming screen frames/data to all other connected devices
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client terminated connection socket.');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`CONNECTWISE CLONE ACTIVE AT: http://localhost:${PORT}`);
    console.log(`==================================================`);
});
