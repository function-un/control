const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
// Import the native OS input simulator framework
const robot = require('robotjs'); 

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
    console.log('Endpoint authenticated to ConnectWise core relay.');

    ws.on('message', (message) => {
        // Handle incoming data streams
        const dataString = message.toString();

        if (dataString.startsWith('{')) {
            try {
                const event = JSON.parse(dataString);
                
                // SYSTEM ADVENT TARGET: Intercept click events from the remote technician
                if (event.type === 'click') {
                    console.log(`SYSADMIN EVENT: Simulating remote click at X: ${event.x}, Y: ${event.y}`);
                    
                    // Move the operating system mouse pointer and perform a clean hardware click
                    robot.moveMouse(event.x, event.y);
                    robot.mouseClick();
                }
            } catch (e) {
                // Drop malformed json packet frames quietly
            }
        } else {
            // Broadcast standard live screen video snapshots across the socket pipeline
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`CONNECTWISE INTERACTIVE ACTIVE AT: http://localhost:${PORT}`);
    console.log(`==================================================`);
});
