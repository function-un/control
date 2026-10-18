const io = require('socket.io-client');
const screenshot = require('screenshot-desktop');
const robot = require('@jitsi/robotjs');

// Change this to your live Render URL once deployed (e.g., https://onrender.com)
const CLOUD_SERVER_URL = "http://localhost:3000"; 

const socket = io(CLOUD_SERVER_URL, {
    query: { role: 'host' },
    reconnectionAttempts: 10,
    reconnectionDelay: 5000
});

console.log("⚡ Establishing secure outbound tunnel to cloud relay...");

socket.on('connect', () => {
    console.log("✅ Successfully linked to Cloud Relay Server.");
});

let isProcessingFrame = false;

// Continuously capture screen frames and send them up to the cloud
setInterval(async () => {
    if (isProcessingFrame || !socket.connected) return;
    isProcessingFrame = true;

    try {
        const imgBuffer = await screenshot({ format: 'jpeg' });
        socket.emit('screen-data-stream', imgBuffer.toString('base64'));
    } catch (err) {
        console.error("❌ Screen capture failed:", err.message);
    } finally {
        isProcessingFrame = false;
    }
}, 200);

// Listen for execution commands sent down from the cloud admin panel
socket.on('execute-click', (data) => {
    try {
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
            robot.moveMouse(data.x, data.y);
            robot.mouseClick();
        }
    } catch (err) {
        console.error("❌ Failed to execute remote click:", err.message);
    }
});

socket.on('execute-type', (data) => {
    try {
        if (data && data.key) {
            if (data.modifier) {
                robot.keyToggle(data.modifier, 'down');
                robot.keyTap(data.key);
                robot.keyToggle(data.modifier, 'up');
            } else {
                robot.keyTap(data.key);
            }
        }
    } catch (err) {
        console.error("❌ Failed to execute remote keypress:", err.message);
    }
});

socket.on('disconnect', () => {
    console.log("⚠️ Disconnected from cloud server. Retrying...");
});
