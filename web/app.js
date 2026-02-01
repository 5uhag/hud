const app = document.getElementById('app');
let socket;

// Default Modules configuration
const moduleConfig = {
    cpu: { label: 'CPU Load', unit: '%', color: 'var(--accent-cyan)' },
    ram: { label: 'RAM Usage', unit: '%', color: 'var(--accent-purple)' },
    net: { label: 'Network', unit: 'KB/s', color: 'var(--accent-green)' },
    battery: { label: 'Battery', unit: '%', color: '#ffaa00' }, // Placeholder, added if available
    uptime: { label: 'Uptime', unit: 'hrs', color: '#888' }
};

function initGrid() {
    app.innerHTML = '';
    const enabledModules = getEnabledModules();

    enabledModules.forEach(key => {
        if (!moduleConfig[key]) return;
        const conf = moduleConfig[key];

        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-type', key);
        card.innerHTML = `
            <h3>${conf.label}</h3>
            <div class="data-display">
                <span id="val-${key}" class="value">--</span>
                <span class="unit">${conf.unit}</span>
            </div>
            <div class="bar-container">
                <div id="bar-${key}" class="bar-fill" style="background:${conf.color}"></div>
            </div>
        `;
        app.appendChild(card);
    });
}

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => console.log('Connected to HUD Host');

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateUI(data);
    };

    socket.onclose = () => {
        console.log('Disconnected. Retrying in 2s...');
        setTimeout(connect, 2000);
    };
}

function updateUI(data) {
    // CPU
    updateCard('cpu', data.cpu_percent.toFixed(1), data.cpu_percent);

    // RAM
    updateCard('ram', data.mem_percent.toFixed(1), data.mem_percent);

    // Network (Convert bytes to KB/s approx) - This is total counters, so we'd need diff logic for speed
    // For now, let's just show raw uptime or something simple
    // Implementing accurate speed requires storing previous state, let's do simple counter for now
    // Actually, let's display Uptime properly
    const uptimeHrs = (data.uptime / 3600).toFixed(1);
    const uptimeEl = document.getElementById('val-uptime');
    if (uptimeEl) uptimeEl.innerText = uptimeHrs;

    // Net is tricky without history. 
    // Let's just update the value if it exists
    if (document.getElementById('val-net')) {
        document.getElementById('val-net').innerText = '...'; // Needs diff logic
    }
}

function updateCard(key, valueText, percentage) {
    const valEl = document.getElementById(`val-${key}`);
    const barEl = document.getElementById(`bar-${key}`);

    if (valEl) valEl.innerText = valueText;
    if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

// User Preferences
function getEnabledModules() {
    const saved = localStorage.getItem('hud_modules');
    if (saved) return JSON.parse(saved);
    return ['cpu', 'ram', 'uptime'];
}

function toggleSettings() {
    document.getElementById('settings-overlay').classList.toggle('hidden');
}

function updateModules() {
    const inputs = document.querySelectorAll('#settings-overlay input');
    const enabled = [];
    inputs.forEach(input => {
        if (input.checked) enabled.push(input.dataset.module);
    });
    localStorage.setItem('hud_modules', JSON.stringify(enabled));
    initGrid();
}

// Initialize
initGrid();
connect();
