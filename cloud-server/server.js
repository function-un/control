const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Allows the local agent to connect from anywhere
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    const role = socket.handshake.query.role;
    console.log(`👤 New connection: ${socket.id} registered as [${role}]`);

    if (role === 'host') {
        socket.join('hosts-room');
        console.log("💻 Host agent is ready to stream.");
    } else {
        socket.join('admins-room');
        console.log("👁️ Admin viewer opened the dashboard.");
    }

    // Pipe incoming screen frames from the local agent directly to the admin dashboard
    socket.on('screen-data-stream', (base64Data) => {
        socket.to('admins-room').emit('screen-data', base64Data);
    });

    // Forward remote mouse inputs down to the target computer
    socket.on('remote-click', (data) => {
        socket.to('hosts-room').emit('execute-click', data);
    });

    // Forward remote keyboard inputs down to the target computer
    socket.on('remote-type', (data) => {
        socket.to('hosts-room').emit('execute-type', data);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Session dropped: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Cloud Relay Server running on port ${PORT}`);
});
