const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const screenshot = require('screenshot-desktop');
const robot = require('@jitsi/robotjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    pingTimeout: 10000,
    pingInterval: 5000
});

let isProcessingFrame = false;
let captureIntervalId = null;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function takeScreenFrame() {
    try {
        const imgBuffer = await screenshot({ format: 'jpeg' });
        return imgBuffer.toString('base64');
    } catch (err) {
        throw new Error(`Frame reading failed: ${err.message}`);
    }
}

function startScreenStreaming() {
    if (captureIntervalId) return;

    console.log("🚀 Starting continuous desktop frame loop...");
    captureIntervalId = setInterval(async () => {
        if (isProcessingFrame) return;
        isProcessingFrame = true;

        try {
            const base64Data = await takeScreenFrame();
            io.emit('screen-data', base64Data);
        } catch (err) {
            console.error("❌ System screen grab drop:", err.message);
        } finally {
            isProcessingFrame = false;
        }
    }, 200);
}

function stopScreenStreaming() {
    if (captureIntervalId) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
        console.log("🛑 Admin connection dropped. Suspending feed.");
    }
}

io.on('connection', (socket) => {
    console.log(`👤 Connection mapped. Active sessions: ${io.engine.clientsCount}`);
    startScreenStreaming();

    socket.on('remote-click', (data) => {
        try {
            if (data && typeof data.x === 'number' && typeof data.y === 'number') {
                robot.moveMouse(data.x, data.y);
                robot.mouseClick();
            }
        } catch (err) {
            console.error("❌ Mouse execution failure:", err.message);
        }
    });

    socket.on('remote-type', (data) => {
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
            console.error("❌ Key trigger failure:", err.message);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${reason}`);
        if (io.engine.clientsCount === 0) {
            stopScreenStreaming();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=======================================`);
    console.log(`🔗 Remote Admin Panel Active on Port: ${PORT}`);
    console.log(`=======================================`);
});
