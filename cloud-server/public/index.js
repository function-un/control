// Wait for DOM parsing to finish completely before binding orchestration events
document.addEventListener('DOMContentLoaded', () => {
    // 1. Establish asynchronous context handshake targeting the cloud runtime
    const socket = io({ query: { role: 'admin' } });
    let masterRegistry = {};
    let activeSelectedDevice = null;
    let runningStreamSession = false;

    // 2. Cache object definitions from the view scope layout
    const gridView = document.getElementById('nodes-canvas-grid');
    const countAllBtn = document.getElementById('btn-count-all');
    const topBar = document.getElementById('deck-top-bar');
    const toolsRibbon = document.getElementById('operator-ribbon');
    const defaultPlaceholder = document.getElementById('center-placeholder-msg');
    const shieldFrame = document.getElementById('canvas-frame-shield');
    const streamCanvas = document.getElementById('stream-canvas-core');
    const txtTitle = document.getElementById('active-machine-title');
    const dotStatus = document.getElementById('active-dot-status');
    const triggerBtn = document.getElementById('btn-session-trigger');
    const syncFrameBtn = document.getElementById('btn-sync-frame');
    
    const toolCad = document.getElementById('tool-cad');
    const toolRun = document.getElementById('tool-run');
    const toolTerminate = document.getElementById('tool-terminate');

    // 3. Process data broadcast arrays mapping cluster telemetry profiles
    socket.on('registry-update', (registry) => {
        masterRegistry = registry;
        gridView.innerHTML = '';
        const devices = Object.keys(registry);
        countAllBtn.innerText = `All Nodes (${devices.length})`;

        if (devices.length === 0) {
            gridView.innerHTML = '<div class="stage-placeholder" style="font-size:0.8rem; padding-top:40px;">No registered nodes found in cluster inventory logs.</div>';
            return;
        }

        devices.forEach(name => {
            const node = registry[name];
            const isOnline = node.status === 'Online';
            
            const card = document.createElement('div');
            card.className = `node-card ${activeSelectedDevice === name ? 'active' : ''}`;
            
            // Map explicit tracking scope closures to each target entry card
            card.addEventListener('click', (e) => {
                focusTargetDeviceNode(name, e.currentTarget);
            });
            
            card.innerHTML = `
                <div class="node-row-1">
                    <span class="node-title">${name}</span>
                    <div class="pulse-badge">
                        <div class="pulse-dot ${isOnline ? 'online' : 'offline'}"></div>
                        <span style="color: ${isOnline ? 'var(--status-on)' : 'var(--text-muted)'}">${node.status}</span>
                    </div>
                </div>
                <div class="node-row-2">
                    <span>Platform: ${node.os || 'Windows'}</span>
                    <span>Seen: ${node.lastSeen.split(' ')[1] || node.lastSeen}</span>
                </div>
            `;
            gridView.appendChild(card);
        });

        if (activeSelectedDevice && registry[activeSelectedDevice]) {
            syncUIConsoleState(activeSelectedDevice);
        }
    });

    function focusTargetDeviceNode(name, targetCardElement) {
        activeSelectedDevice = name;
        
        document.querySelectorAll('.node-card').forEach(c => c.classList.remove('active'));
        if (targetCardElement) {
            targetCardElement.classList.add('active');
        }

        defaultPlaceholder.style.display = 'none';
        topBar.style.display = 'flex';
        
        syncUIConsoleState(name);

        if (masterRegistry[name].status === 'Offline') {
            shieldFrame.style.display = 'none';
            toolsRibbon.style.display = 'none';
            defaultPlaceholder.style.display = 'block';
            defaultPlaceholder.innerHTML = '<span style="color:var(--status-off); font-weight:600;">⚠️ Selected node endpoint is currently offline. Remote control channel connection is blocked.</span>';
            triggerBtn.style.opacity = '0.3';
            triggerBtn.style.pointerEvents = 'none';
            runningStreamSession = false;
        } else {
            defaultPlaceholder.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://w3.org"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg><div>Select an active, authenticated endpoint profile from the systems explorer grid to establish a remote management session.</div>';
            triggerBtn.style.opacity = '1';
            triggerBtn.style.pointerEvents = 'auto';
            if (runningStreamSession) {
                shieldFrame.style.display = 'block';
                toolsRibbon.style.display = 'flex';
            }
        }
    }

    function syncUIConsoleState(name) {
        const node = masterRegistry[name];
        txtTitle.innerText = `Control Console: ${name}`;
        if (node.status === 'Online') {
            dotStatus.className = "status-dot status-online";
            triggerBtn.innerText = runningStreamSession ? "Active Session Connected" : "Initialize Access";
        } else {
            dotStatus.className = "status-dot status-offline";
        }
    }

    function mountActiveControlStream() {
        if (!activeSelectedDevice || masterRegistry[activeSelectedDevice].status === 'Offline') return;
        
        defaultPlaceholder.style.display = 'none';
        shieldFrame.style.display = 'block';
        toolsRibbon.style.display = 'flex';
        streamCanvas.src = "";
        runningStreamSession = true;
        triggerBtn.innerText = "Active Session Connected";
        
        socket.emit('join-device-stream', activeSelectedDevice);
        console.log(`📡 RMM requested active display pipeline mapping for: ${activeSelectedDevice}`);
    }

    function disconnectCurrentSession() {
        shieldFrame.style.display = 'none';
        toolsRibbon.style.display = 'none';
        defaultPlaceholder.style.display = 'block';
        defaultPlaceholder.innerHTML = '<div>Session explicitly disconnected by supervisor operator. Choose a system to reconnect.</div>';
        runningStreamSession = false;
        triggerBtn.innerText = "Initialize Access";
        socket.emit('leave-device-stream', activeSelectedDevice);
    }

    function forceCanvasFrameRefresh() {
        if (activeSelectedDevice && runningStreamSession) {
            socket.emit('force-frame-refresh', activeSelectedDevice);
        }
    }

    function sendMacroCommand(type) {
        if (activeSelectedDevice && runningStreamSession) {
            socket.emit('remote-macro', { targetDevice: activeSelectedDevice, macro: type });
            console.log(`⌨️ Special tool macro sent: ${type}`);
        }
    }

    // 4. Bind listeners to the control bar elements
    triggerBtn.addEventListener('click', mountActiveControlStream);
    syncFrameBtn.addEventListener('click', forceCanvasFrameRefresh);
    toolCad.addEventListener('click', () => sendMacroCommand('ctrl-alt-del'));
    toolRun.addEventListener('click', () => sendMacroCommand('win-r'));
    toolTerminate.addEventListener('click', disconnectCurrentSession);

    socket.on('screen-data', (base64String) => {
        if (activeSelectedDevice && runningStreamSession && masterRegistry[activeSelectedDevice].status === 'Online') {
            streamCanvas.src = "data:image/jpeg;base64," + base64String;
        }
    });

    // Mouse click scaling system coordinate mapping engine
    shieldFrame.addEventListener('click', (event) => {
        if (!activeSelectedDevice || !runningStreamSession) return;
        const bounds = streamCanvas.getBoundingClientRect();
        const clickPayload = {
            x: Math.round(((event.clientX - bounds.left) / bounds.width) * streamCanvas.naturalWidth),
            y: Math.round(((event.clientY - bounds.top) / bounds.height) * streamCanvas.naturalHeight)
        };

        if (!isNaN(clickPayload.x) && !isNaN(clickPayload.y)) {
            socket.emit('remote-click', { targetDevice: activeSelectedDevice, data: clickPayload });
        }
    });

    // Keyboard tracking serialization logic mapping pipeline
    window.addEventListener('keydown', (event) => {
        if (!activeSelectedDevice || !runningStreamSession) return;
        
        // Bypass capture tracking keys to ensure operator navigation choices aren't blocked
        if (['F12', 'F5', 'F11'].includes(event.key)) return;
        if (event.key === 'Tab' || event.key === 'Backspace') event.preventDefault();

        const keyPayload = { key: event.key.toLowerCase(), modifier: null };
        if (event.ctrlKey) keyPayload.modifier = 'control';
        if (event.shiftKey) keyPayload.modifier = 'shift';
        if (event.altKey) keyPayload.modifier = 'alt';

        if (['control', 'shift', 'alt'].includes(keyPayload.key)) return;

        socket.emit('remote-type', { targetDevice: activeSelectedDevice, data: keyPayload });
    });
});
