'use strict';
'require view';
'require fs';
'require poll';
'require ui';
'require dom';
'require uci';

/* =============================================================================
   luci-app-jodu5164x-status - Advanced 5G ODU Dashboard
   ============================================================================= */

var SCRIPT_PATH = '/usr/libexec/jodu5164x-data.sh';

// Modern Curated Color Palette
var COLOR_GOOD = '#10b981';     // Emerald 500
var COLOR_OK = '#f59e0b';       // Amber 500
var COLOR_POOR = '#ef4444';     // Rose 500
var COLOR_NEUTRAL = '#94a3b8';  // Slate 400
var COLOR_BLUE = '#3b82f6';     // Blue 500
var COLOR_PURPLE = '#8b5cf6';   // Purple 500
var COLOR_CYAN = '#06b6d4';     // Cyan 500

function svgIcon(name, size, color) {
    var s = size || 16;
    var c = color || 'currentColor';
    var paths = {
        signal: '<path d="M2 18h3v-4H2v4zm5 0h3v-8H7v8zm5 0h3V6h-3v12zm5 0h3V2h-3v16z"/>',
        speed: '<path d="M13 2.5L4 13.5h6l-1 8 9-11h-6l1-8z"/>',
        sinr: '<path d="M12 3a9 9 0 00-9 9c0 2.4.9 4.6 2.4 6.2l1.4-1.4A7 7 0 1119 12h2a9 9 0 00-9-9zm-4 9a4 4 0 118 0 4 4 0 01-8 0z"/>',
        ca: '<path d="M4 6h16v2H4V6zm2 5h12v2H6v-2zm3 5h6v2H9v-2z"/>',
        cell: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>',
        cable: '<path d="M18 6h-2V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2zm-8-2h4v2h-4V4zm8 14H6V8h12v10zm-7-7h2v5h-2v-5zm4 0h2v5h-2v-5zm-8 0h2v5H7v-5z"/>',
        radar: '<path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 17.93V13h4.93a8 8 0 01-4.93 6.93zM13 11V4.07A8 8 0 0117.93 11zm-2-6.93V11H4.07A8 8 0 0111 4.07zM4.07 13H11v6.93A8 8 0 014.07 13z"/>',
        temp: '<path d="M15 13V5a3 3 0 00-6 0v8a5 5 0 106 0zm-3 8a3 3 0 01-1.5-.42V5a1.5 1.5 0 013 0v15.58A3 3 0 0112 21z"/>',
        cpu: '<path d="M9 3v2h6V3h2v2h2a2 2 0 012 2v2h2v2h-2v6h2v2h-2v2a2 2 0 01-2 2h-2v2h-2v-2H9v2H7v-2H5a2 2 0 01-2-2v-2H1v-2h2v-6H1V9h2V7a2 2 0 012-2h2V3h2zm8 4H7v10h10V7zm-2 2v6H9V9h6z"/>',
        ram: '<path d="M4 5h16v14H4V5zm2 2v10h12V7H6zm2 2h2v3H8V9zm4 0h2v3h-2V9zm4 0h2v3h-2V9z"/>',
        chip: '<path d="M6 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H6zm0 2h12v12H6V6zm2 2v8h8V8H8zm2 2h4v4h-4v-4z"/>',
        settings: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.48.48 0 0014 2h-4c-.25 0-.46.18-.49.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.63 8.87a.49.49 0 00.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
        refresh: '<path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>',
        pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
        play: '<path d="M8 5v14l11-7z"/>',
        customize: '<path d="M3 5h8v2H3V5zm0 6h14v2H3v-2zm0 6h10v2H3v-2zm16-4v-2h-2V7h-2v4h-2v2h2v4h2v-4h2z"/>',
        lock: '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>',
        unlock: '<path d="M12 13c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6-5h-1V6c0-2.76-2.24-5-5-5-2.28 0-4.27 1.54-4.84 3.75l1.94.5c.34-1.32 1.53-2.25 2.9-2.25 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>',
        sound: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
        soundOff: '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
        globe: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.93 9h-3.95a15.65 15.65 0 00-1.37-5.06A8.04 8.04 0 0119.93 11zM12 4.07c1.07 1.96 1.87 4.31 2.06 6.93H9.94c.19-2.62.99-4.97 2.06-6.93zM4.07 13h3.95c.19 2.62.99 4.97 2.06 6.93A8.04 8.04 0 014.07 13zm3.95-2H4.07a8.04 8.04 0 015.32-4.94A15.65 15.65 0 008.02 11zm3.92 6.93c-1.07-1.96-1.87-4.31-2.06-6.93h4.12c-.19 2.62-.99 4.97-2.06 6.93zm4.67-1.87A15.65 15.65 0 0015.98 11h3.95a8.04 8.04 0 01-5.32 4.94z"/>',
        close: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>'
    };
    var p = paths[name] || paths.signal;
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('width', String(s));
    el.setAttribute('height', String(s));
    el.setAttribute('fill', c);
    el.setAttribute('style', 'display:inline-block;vertical-align:middle;flex-shrink:0;');
    el.innerHTML = p;
    return el;
}

var cdtExpanded = false;
var rebootState = { inProgress: false, sawOffline: false };
var aimingSession = {
    active: false,
    startRsrp: null,
    peakRsrp: null,
    peakSinr: null,
    initialPci: null,
    audioMuted: true
};
var triggerRefresh = null;
var openSettings = null;
var openCustomizeModal = null;
var currentPollInterval = 3;

var WIDGET_CATALOG = [
    { id: 'summary', name: 'Quick Metrics Summary', desc: 'Top telemetry cards (Network, Signal Power, Radio Purity, Signal Level)', icon: 'signal' },
    { id: 'primary_cell', name: 'Primary Cell Parameters', desc: 'Primary serving cell radio parameters, TAC, Cell ID, Tower Distance', icon: 'cell' },
    { id: 'secondary_cell', name: 'Secondary Cell (Carrier Aggregation)', desc: 'Secondary carrier metrics and aggregate bandwidth breakdown', icon: 'ca' },
    { id: 'nearby_cells', name: 'Nearby Cells & Sector Scan', desc: 'Neighbouring sector towers with 1-click lock and unlock buttons', icon: 'radar' },
    { id: 'eth_mgmt', name: 'ODU Management & Hardware Control', desc: 'Ethernet link details, cable diagnostics, and remote ODU reboot', icon: 'cable' },
    { id: 'cpu_gauge', name: 'CPU Usage Gauge', desc: 'Circular CPU percentage gauge and 5-minute history telemetry', icon: 'cpu' },
    { id: 'memory', name: 'Memory (RAM) Telemetry', desc: 'RAM usage gauge, total/used/free/cached/buffers, and sparkline', icon: 'ram' },
    { id: 'cpu_detail', name: 'CPU Detailed Breakdown', desc: 'User, System, Idle, I/O wait, IRQ, context switches, active connections', icon: 'chip' },
    { id: 'data_usage', name: 'Data Usage & Bandwidth Tracker', desc: 'Session data upload/download volume and rolling history windows', icon: 'speed' },
    { id: 'thermal', name: 'Internal Thermal Sensors', desc: 'Multi-zone temperature grid and hottest sensor alert', icon: 'temp' }
];

var DEFAULT_WIDGET_VISIBILITY = {
    summary: true,
    primary_cell: true,
    secondary_cell: true,
    nearby_cells: true,
    eth_mgmt: true,
    cpu_gauge: false,
    memory: false,
    cpu_detail: false,
    data_usage: false,
    thermal: false
};

var WIDGET_STORAGE_KEY = 'jodu5164x_widget_visibility_v1';
var DISCOVER_DISMISSED_KEY = 'jodu5164x_discover_dismissed_v1';

function getWidgetVisibility() {
    try {
        if (typeof localStorage !== 'undefined') {
            var saved = localStorage.getItem(WIDGET_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        }
    } catch (e) { }
    return {};
}

function isWidgetVisible(id) {
    var map = getWidgetVisibility();
    if (map[id] !== undefined) return !!map[id];
    return DEFAULT_WIDGET_VISIBILITY[id] !== false;
}

function setWidgetVisibility(id, visible) {
    var map = getWidgetVisibility();
    map[id] = !!visible;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(map));
        }
    } catch (e) { }
}

function resetWidgetVisibility() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(DEFAULT_WIDGET_VISIBILITY));
            localStorage.removeItem(DISCOVER_DISMISSED_KEY);
        }
    } catch (e) { }
}

function buildDiscoverBanner() {
    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem(DISCOVER_DISMISSED_KEY) === '1') {
            return null;
        }
    } catch (e) { }

    var disabledCount = 0;
    ['cpu_gauge', 'memory', 'cpu_detail', 'data_usage', 'thermal'].forEach(function (id) {
        if (!isWidgetVisible(id)) disabledCount++;
    });
    if (disabledCount === 0) return null;

    return E('div', {
        'class': 'jodu-discover-banner',
        'style': 'margin-bottom:14px;padding:10px 14px;background:#0d1522;border:1px solid #1e293b;border-left:3px solid #38bdf8;border-radius:4px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;'
    }, [
        E('div', { 'style': 'display:flex;align-items:center;gap:10px;flex:1;min-width:260px;' }, [
            svgIcon('customize', 18, '#38bdf8'),
            E('div', {}, [
                E('div', { 'style': 'font-weight:700;color:#f8fafc;font-size:0.85em;display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:0.02em;' }, [
                    'OPTIONAL TELEMETRY MODULES AVAILABLE',
                    E('span', { 'class': 'jodu-badge', 'style': 'background:#1e293b;color:#94a3b8;border:1px solid #334155;font-size:0.7em;' }, disabledCount + ' Disabled')
                ]),
                E('div', { 'style': 'color:#94a3b8;font-size:0.78em;margin-top:2px;line-height:1.3;' },
                    'CPU Gauge, RAM Telemetry, Detailed Diagnostics, Bandwidth Tracker, and Thermal Grid are paused for minimal CPU overhead.'
                )
            ])
        ]),
        E('div', { 'style': 'display:flex;align-items:center;gap:8px;' }, [
            E('button', {
                'class': 'btn jodu-btn-sm',
                'style': 'background:#0369a1;border-color:#0284c7;color:#fff;',
                'click': function () {
                    if (openCustomizeModal) openCustomizeModal();
                }
            }, [
                svgIcon('customize', 13, '#fff'),
                E('span', { 'style': 'margin-left:4px;' }, 'Manage Widgets')
            ]),
            E('button', {
                'class': 'btn jodu-btn-sm',
                'title': 'Dismiss this notice',
                'style': 'background:#0f172a;color:#64748b;border-color:#1e293b;padding:4px 8px;',
                'click': function (ev) {
                    ev.stopPropagation();
                    try {
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem(DISCOVER_DISMISSED_KEY, '1');
                        }
                    } catch (e) { }
                    if (triggerRefresh) triggerRefresh();
                }
            }, [svgIcon('close', 12, '#64748b')])
        ])
    ]);
}

function buildAutoGrid(elements) {
    var visible = elements.filter(function (el) { return el != null; });
    if (!visible.length) return null;
    return E('div', { 'class': 'jodu-grid-auto' }, visible);
}

function notify(text, cls, duration) {
    var n = ui.addNotification(null, E('p', {}, text), cls || 'info');
    if (duration) {
        setTimeout(function () {
            if (n && n.parentNode) n.parentNode.removeChild(n);
        }, duration);
    }
    return n;
}

function getActiveWidgetsArg() {
    if (aimingSession && aimingSession.active) {
        return 'aiming,summary,primary_cell,secondary_cell';
    }
    var active = [];
    WIDGET_CATALOG.forEach(function (w) {
        if (isWidgetVisible(w.id)) active.push(w.id);
    });
    return active.length ? active.join(',') : 'none';
}

function fetchStatus() {
    var activeArg = getActiveWidgetsArg();
    return fs.exec_direct(SCRIPT_PATH, [activeArg]).then(function (res) {
        try {
            return JSON.parse(res);
        } catch (e) {
            return { server_link: 'OFFLINE', error: 'parse_error' };
        }
    }).catch(function () {
        return { server_link: 'OFFLINE', error: 'exec_failed' };
    });
}

function qualityColor(kind, raw) {
    var v = parseFloat(raw);
    if (raw == null || raw === '' || raw === 'NA' || raw === '--' || isNaN(v))
        return COLOR_NEUTRAL;
    switch (kind) {
        case 'rsrp':
            if (v >= -85) return COLOR_GOOD;
            if (v >= -105) return COLOR_OK;
            return COLOR_POOR;
        case 'rsrq':
            if (v >= -10) return COLOR_GOOD;
            if (v >= -15) return COLOR_OK;
            return COLOR_POOR;
        case 'sinr':
            if (v >= 15) return COLOR_GOOD;
            if (v >= 0) return COLOR_OK;
            return COLOR_POOR;
        case 'bler':
            if (v <= 2) return COLOR_GOOD;
            if (v <= 10) return COLOR_OK;
            return COLOR_POOR;
        case 'speed':
            if (v >= 2000) return COLOR_PURPLE;
            if (v >= 1000) return COLOR_GOOD;
            if (v >= 100) return COLOR_OK;
            return COLOR_POOR;
        default:
            return COLOR_NEUTRAL;
    }
}

function formatSpeed(raw) {
    var v = parseFloat(raw);
    if (raw == null || raw === '' || raw === 'NA' || raw === '--' || isNaN(v))
        return raw || 'NA';
    if (v >= 1000) {
        var gbps = v / 1000;
        var gStr = (gbps % 1 === 0) ? gbps.toFixed(0) : gbps.toFixed(1);
        return gStr + ' Gbps';
    }
    return v + ' Mbps';
}

function formatUptime(raw) {
    var v = parseInt(raw, 10);
    if (raw == null || raw === '' || raw === 'NA' || raw === '--' || isNaN(v))
        return raw || 'NA';
    var days = Math.floor(v / 86400);
    var hours = Math.floor((v % 86400) / 3600);
    var minutes = Math.floor((v % 3600) / 60);
    var seconds = v % 60;
    var parts = [];
    if (days > 0) parts.push(days + 'd');
    if (days > 0 || hours > 0) parts.push(hours + 'h');
    parts.push(minutes + 'm');
    parts.push(seconds + 's');
    return parts.join(' ');
}

function signalQualityPercent(rsrp) {
    var v = parseFloat(rsrp);
    if (isNaN(v)) return null;
    var pct = ((v + 120) / 60) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return Math.round(pct);
}

function renderSignalBars(barsCount, color) {
    var count = parseInt(barsCount, 10);
    if (isNaN(count) || count < 0) count = 0;
    if (count > 4) count = 4;

    var col = color || (count >= 3 ? COLOR_GOOD : (count === 2 ? COLOR_OK : (count === 0 ? COLOR_NEUTRAL : COLOR_POOR)));
    var heights = [6, 10, 14, 18];
    var bars = [];

    for (var i = 0; i < 4; i++) {
        var active = (i < count);
        bars.push(E('span', {
            'class': 'jodu-sig-bar' + (active ? ' jodu-sig-bar-active' : ''),
            'style': 'display:inline-block;width:5px;height:' + heights[i] + 'px;border-radius:1px;background:' +
                (active ? col : '#1e293b') + ';'
        }));
    }

    return E('div', {
        'class': 'jodu-signal-meter' + (count === 4 ? ' jodu-signal-meter-max' : ''),
        'style': 'display:inline-flex;align-items:flex-end;gap:3px;height:18px;margin-right:6px;'
    }, bars);
}

function summaryCard(label, value, color, sublabel, icon, visualElem, accentColor) {
    var acc = accentColor || color || '#38bdf8';
    var children = [];
    if (icon) {
        children.push(E('div', { 'class': 'jodu-sum-icon' }, icon));
    }
    var valContent;
    if (visualElem) {
        valContent = E('div', { 'style': 'display:inline-flex;align-items:center;gap:6px;' }, [
            visualElem,
            E('span', {}, value)
        ]);
    } else {
        valContent = value;
    }
    children.push(E('div', {
        'class': 'jodu-sum-val',
        'style': 'color:' + (color || '#f8fafc') + ';'
    }, valContent));
    if (sublabel) {
        children.push(E('div', { 'class': 'jodu-sum-sub' }, sublabel));
    }
    children.push(E('div', { 'class': 'jodu-sum-lbl' }, label));
    return E('div', {
        'class': 'jodu-sum-card',
        'style': 'border-top:2px solid ' + acc + ';'
    }, children);
}

function summaryRow(data, online) {
    if (!isWidgetVisible('summary')) return null;

    var hideBtn = E('button', {
        'class': 'jodu-summary-hide-btn',
        'title': 'Hide Quick Metrics Summary (restore anytime from Widgets)',
        'click': function (ev) {
            ev.stopPropagation();
            setWidgetVisibility('summary', false);
            notify('Hidden "Quick Metrics Summary". You can restore it anytime from "Widgets".', 'info', 3500);
            if (triggerRefresh) triggerRefresh();
        }
    }, [svgIcon('close', 12, '#64748b')]);

    var cards;
    if (!online) {
        cards = [
            summaryCard('NETWORK', 'OFFLINE', COLOR_POOR, 'ODU Unreachable', svgIcon('cell', 16, COLOR_POOR), null, COLOR_POOR),
            summaryCard('SIGNAL STRENGTH', '--', COLOR_NEUTRAL, 'No connection', svgIcon('signal', 16, COLOR_NEUTRAL), null, COLOR_NEUTRAL),
            summaryCard('RADIO PURITY', '--', COLOR_NEUTRAL, 'Telemetry paused', svgIcon('sinr', 16, COLOR_NEUTRAL), null, COLOR_NEUTRAL),
            summaryCard('SIGNAL LEVEL', '--', COLOR_NEUTRAL, 'No connection', svgIcon('signal', 16, COLOR_NEUTRAL), renderSignalBars(0, COLOR_NEUTRAL), COLOR_NEUTRAL)
        ];
    } else {
        var qualityPct = signalQualityPercent(data.rsrp);
        var noSim = data.sim_status === 'missing';
        var netSub = (data.plmn || '405-874') + (data.operating_mode ? ' · NR5G-' + data.operating_mode : '') + (data.band ? ' · B' + data.band : '');
        var sigSub = qualityPct != null ? (qualityPct + '% · ' + (qualityPct >= 75 ? 'Excellent Coverage' : (qualityPct >= 45 ? 'Good Signal' : 'Weak Signal'))) : 'Sampling...';
        var sinrVal = (data.sinr && data.sinr !== 'NA' && data.sinr !== '--') ? data.sinr + ' dB SINR' : 'NA';
        var puritySub = (data.rsrq && data.rsrq !== 'NA' && data.rsrq !== '--') ? 'RSRQ: ' + data.rsrq + ' dB' : 'Carrier Sync Active';

        var rawBars = parseInt(data.signal_strength, 10);
        var hasBars = !isNaN(rawBars) && rawBars >= 0 && data.signal_strength !== '--';
        var barsVal = hasBars ? (rawBars > 4 ? 4 : rawBars) : 0;
        var barsColor = hasBars ? (barsVal >= 3 ? COLOR_GOOD : (barsVal === 2 ? COLOR_OK : (barsVal === 0 ? COLOR_NEUTRAL : COLOR_POOR))) : COLOR_NEUTRAL;
        var barsQuality = hasBars ? (barsVal === 4 ? 'Excellent' : (barsVal === 3 ? 'Very Good' : (barsVal === 2 ? 'Good' : (barsVal === 1 ? 'Poor' : 'No Signal')))) : 'Sampling...';
        var barsSub = hasBars ? (barsVal + '/4 Bars · ' + barsQuality) : 'Cellular Level';

        var rsrpColor = qualityColor('rsrp', data.rsrp);
        var sinrColor = qualityColor('sinr', data.sinr);

        cards = [
            noSim ? summaryCard('NETWORK', 'No SIM', COLOR_POOR, 'Please insert pSIM or eSIM', svgIcon('cell', 16, COLOR_POOR), null, COLOR_POOR) :
                summaryCard('NETWORK', 'JioTrue 5G', '#38bdf8', netSub, svgIcon('cell', 16, '#38bdf8'), null, '#38bdf8'),
            summaryCard('SIGNAL STRENGTH', (data.rsrp && data.rsrp !== 'NA' && data.rsrp !== '--') ? data.rsrp + ' dBm' : 'NA', rsrpColor, sigSub, svgIcon('signal', 16, rsrpColor), null, rsrpColor),
            summaryCard('RADIO PURITY', sinrVal, sinrColor, puritySub, svgIcon('sinr', 16, sinrColor), null, sinrColor),
            summaryCard('SIGNAL LEVEL', hasBars ? (barsVal + ' / 4') : 'NA', barsColor, barsSub, svgIcon('signal', 16, barsColor), renderSignalBars(barsVal, barsColor), barsColor)
        ];
    }

    return E('div', { 'class': 'jodu-summary-wrapper' }, [
        hideBtn,
        E('div', { 'class': 'jodu-sum-row' }, cards)
    ]);
}

function colorDot(color) {
    return E('span', {
        'class': 'jodu-dot',
        'style': 'background:' + color + ';'
    }, '');
}

function paramRow(label, value, color) {
    var display = (value != null && value !== '') ? value : 'NA';
    var cellChildren = color ? [colorDot(color), display] : [display];
    return E('tr', { 'class': 'jodu-tr' }, [
        E('td', { 'class': 'jodu-td-lbl' }, label),
        E('td', { 'class': 'jodu-td-val' + (color ? ' jodu-has-color' : ''), 'style': color ? ('color:' + color) : '' }, cellChildren)
    ]);
}

function isEmptyValue(v) {
    return v == null || v === '' || v === 'NA' || v === '--';
}

function parseBwMHz(bw) {
    if (!bw || bw === '--' || bw === 'NA') return 0;
    var m = String(bw).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

function formatTowerDistance(ta) {
    if (ta == null || ta === '' || ta === '--' || ta === 'NA') return '--';
    var val = parseInt(ta, 10);
    if (isNaN(val) || val < 0) return '--';
    // 3GPP 5G NR / LTE standard: ~78.12 meters per TA unit (round-trip ~0.52 us)
    var meters = Math.round(val * 78.12);
    if (val === 0) {
        return 'TA: 0 (~0 m to gNodeB)';
    } else if (meters >= 1000) {
        var km = (meters / 1000).toFixed(2);
        return 'TA: ' + val + ' (~' + meters + ' m / ' + km + ' km to gNodeB)';
    } else {
        return 'TA: ' + val + ' (~' + meters + ' m to gNodeB)';
    }
}

function formatTac(tac) {
    if (!tac || tac === '--' || tac === 'NA' || tac === '0') return '--';
    var hex, dec;
    if (String(tac).toLowerCase().indexOf('0x') === 0) {
        dec = parseInt(tac, 16);
        hex = '0x' + dec.toString(16).toUpperCase();
    } else {
        dec = parseInt(tac, 10);
        if (!isNaN(dec)) hex = '0x' + dec.toString(16).toUpperCase();
    }
    if (isNaN(dec)) return String(tac);
    return hex + ' (' + dec + ')';
}

function formatCellId(cid) {
    if (!cid || cid === '--' || cid === 'NA' || cid === '0') return '--';
    var dec = parseInt(cid, 10);
    if (!isNaN(dec)) {
        var hex = '0x' + dec.toString(16).toUpperCase();
        return dec + ' (' + hex + ')';
    }
    return String(cid);
}

function secondaryCellPanel(merged, widgetId) {
    var band = merged['scc_band'];
    var pci = merged['scc_pci'];
    var rsrp = merged['scc_rsrp'];
    var caActive = !isEmptyValue(band) || !isEmptyValue(pci) || !isEmptyValue(rsrp);
    if (!caActive) {
        return panel('Cellular Parameters (Secondary Cell)', E('div', { 'class': 'jodu-idle-panel' }, [
            E('div', { 'style': 'margin-bottom:8px;opacity:0.6;display:flex;justify-content:center;' }, [svgIcon('ca', 24, '#475569')]),
            E('h4', { 'style': 'margin:0 0 4px;color:#94a3b8;font-weight:600;' }, 'Carrier Aggregation Inactive'),
            E('p', { 'style': 'margin:0;color:#64748b;font-size:0.85em;' }, 'Secondary carrier activates dynamically during high throughput demand.')
        ]), svgIcon('ca', 15, '#38bdf8'), null, widgetId);
    }
    var pBw = parseBwMHz(merged['bandwidth']);
    var sBw = parseBwMHz(merged['scc_bw']);
    var totalBw = (pBw > 0 ? pBw : 0) + (sBw > 0 ? sBw : 0);
    var caBadge = totalBw > 0 ? E('span', {
        'class': 'jodu-badge',
        'style': 'background:rgba(168,85,247,0.2);color:#c084fc;border:1px solid rgba(168,85,247,0.4);font-weight:700;'
    }, 'Total: ' + totalBw + ' MHz DL') : null;
    return panel('Cellular Parameters (Secondary Cell)', cellTable('scc_', merged), svgIcon('ca', 15, '#38bdf8'), caBadge, widgetId);
}

function cellTable(prefix, d) {
    var isPrimary = (prefix === '');
    var band = d[prefix + 'band'];
    var rawBw = d[prefix + 'bandwidth'] || d[prefix + 'bw'];
    var arfcn = d[prefix + 'arfcn'];
    var pci = d[prefix + 'pci'];
    var bler = d[prefix + 'bler'];
    var modulation = d[prefix + 'modulation'];
    var mimo = d[prefix + 'mimo'];
    var rsrp = d[prefix + 'rsrp'];
    var rsrq = d[prefix + 'rsrq'];
    var sinr = d[prefix + 'sinr'];

    var sccBand = d['scc_band'];
    var sccPci = d['scc_pci'];
    var sccRsrp = d['scc_rsrp'];
    var caActive = !isEmptyValue(sccBand) || !isEmptyValue(sccPci) || !isEmptyValue(sccRsrp);
    var pBw = parseBwMHz(d['bandwidth']);
    var sBw = parseBwMHz(d['scc_bw']);
    var totalBw = (pBw > 0 ? pBw : 0) + (sBw > 0 ? sBw : 0);

    var bwDisplay = rawBw;
    if (isPrimary) {
        if (caActive && totalBw > pBw) {
            bwDisplay = (rawBw ? rawBw : pBw + ' MHz') + ' (PCC) · Total: ' + totalBw + ' MHz DL (2x CA)';
        }
    } else {
        if (rawBw) {
            bwDisplay = rawBw + ' (SCC)';
        }
    }

    var rows = [
        paramRow('Band', band),
        paramRow('Bandwidth', bwDisplay, isPrimary && caActive && totalBw > pBw ? COLOR_PURPLE : null),
        paramRow('NR-ARFCN', arfcn),
        paramRow('Physical Cell ID', pci)
    ];

    if (isPrimary) {
        var cidFormatted = formatCellId(d['global_cell_id']);
        var tacFormatted = formatTac(d['tac']);
        var distStr = formatTowerDistance(d['timing_advance']);
        rows.push(paramRow('Global Cell ID', cidFormatted));
        rows.push(paramRow('Tracking Area Code (TAC)', tacFormatted));
        rows.push(paramRow('Tower Distance (TA)', distStr, (distStr && distStr !== '--') ? COLOR_GOOD : null));
    } else if (caActive && totalBw > 0) {
        rows.push(paramRow('Aggregate Bandwidth', 'Total: ' + totalBw + ' MHz DL (' + (pBw > 0 ? pBw + ' MHz PCC + ' : '') + sBw + ' MHz SCC)', COLOR_PURPLE));
    }

    rows.push(
        paramRow('BLER (downlink)', (bler != null && bler !== 'NA' && bler !== '--') ? bler + ' %' : bler, qualityColor('bler', bler)),
        paramRow('Modulation', modulation),
        paramRow('MIMO', mimo),
        paramRow('SS-RSRP', (rsrp != null && rsrp !== 'NA' && rsrp !== '--') ? rsrp + ' dBm' : rsrp, qualityColor('rsrp', rsrp)),
        paramRow('SS-RSRQ', (rsrq != null && rsrq !== 'NA' && rsrq !== '--') ? rsrq + ' dB' : rsrq, qualityColor('rsrq', rsrq)),
        paramRow('SS-SINR', (sinr != null && sinr !== 'NA' && sinr !== '--') ? sinr + ' dB' : sinr, qualityColor('sinr', sinr))
    );

    return E('table', { 'class': 'jodu-table' }, rows);
}

function panel(title, contentNode, icon, extraHdr, widgetId) {
    var hdrChildren = [
        E('div', { 'style': 'display:flex;align-items:center;gap:8px;' }, [
            icon ? E('span', { 'class': 'jodu-card-icon' }, [icon]) : '',
            E('span', { 'class': 'jodu-card-title' }, title)
        ])
    ];
    var rightSide = [];
    if (extraHdr) rightSide.push(extraHdr);
    if (widgetId) {
        rightSide.push(E('button', {
            'class': 'jodu-panel-hide-btn',
            'title': 'Hide this section (restore from Widgets)',
            'click': function (ev) {
                ev.stopPropagation();
                setWidgetVisibility(widgetId, false);
                notify('Hidden "' + title + '". You can restore it anytime from "Widgets".', 'info', 3500);
                if (triggerRefresh) triggerRefresh();
            }
        }, [svgIcon('close', 12, '#64748b')]));
    }
    if (rightSide.length) {
        hdrChildren.push(E('div', { 'style': 'display:flex;align-items:center;gap:8px;' }, rightSide));
    }
    return E('div', { 'class': 'jodu-card', 'data-widget': widgetId || '' }, [
        E('div', { 'class': 'jodu-card-hdr', 'style': 'display:flex;justify-content:space-between;align-items:center;' }, hdrChildren),
        E('div', { 'class': 'jodu-card-body' }, [contentNode])
    ]);
}

function lockCell(pci, arfcn) {
    ui.showModal('Lock to Cell?', [
        E('p', {}, 'This will lock the modem to PCI ' + pci + ' / ARFCN ' + arfcn + '. If this cell has weak or no coverage, connectivity may drop until you unlock it.'),
        E('div', { 'class': 'right', 'style': 'margin-top:16px;display:flex;justify-content:flex-end;gap:8px' }, [
            E('button', { 'class': 'btn', 'click': ui.hideModal }, 'Cancel'),
            E('button', {
                'class': 'btn cbi-button-negative',
                'click': function () {
                    ui.hideModal();
                    notify('Locking to PCI ' + pci + ' / ARFCN ' + arfcn + '...', 'info', 4000);
                    fs.exec_direct('/usr/libexec/jodu5164x-cell-lock.sh', ['lock', String(pci), String(arfcn)]).then(function () {
                        if (triggerRefresh) triggerRefresh();
                    }).catch(function () { });
                }
            }, 'Lock')
        ])
    ]);
}

function unlockCell() {
    ui.showModal('Unlock Cell?', [
        E('p', {}, 'This will remove the current cell lock and let the modem pick the best cell automatically.'),
        E('div', { 'class': 'right', 'style': 'margin-top:16px;display:flex;justify-content:flex-end;gap:8px' }, [
            E('button', { 'class': 'btn', 'click': ui.hideModal }, 'Cancel'),
            E('button', {
                'class': 'btn cbi-button-positive',
                'click': function () {
                    ui.hideModal();
                    notify('Unlocking cell...', 'info', 4000);
                    fs.exec_direct('/usr/libexec/jodu5164x-cell-lock.sh', ['unlock']).then(function () {
                        if (triggerRefresh) triggerRefresh();
                    }).catch(function () { });
                }
            }, 'Unlock')
        ])
    ]);
}

function manualLockModal(defaultPci, defaultArfcn) {
    var pciInput = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'placeholder': 'e.g. 182', 'value': defaultPci || '', 'style': 'width:100%' });
    var arfcnInput = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'placeholder': 'e.g. 627264', 'value': defaultArfcn || '', 'style': 'width:100%' });
    ui.showModal('Manual Cell Lock', [
        E('p', {}, 'Lock modem to any specific Physical Cell ID (PCI) and Frequency Channel (ARFCN):'),
        E('div', { 'style': 'margin-bottom:12px' }, [
            E('label', { 'style': 'display:block;margin-bottom:4px;color:#94a3b8;font-size:0.85em;font-weight:600;' }, 'Physical Cell ID (PCI)'),
            pciInput
        ]),
        E('div', { 'style': 'margin-bottom:14px' }, [
            E('label', { 'style': 'display:block;margin-bottom:4px;color:#94a3b8;font-size:0.85em;font-weight:600;' }, 'NR-ARFCN Channel'),
            arfcnInput
        ]),
        E('div', { 'class': 'right', 'style': 'margin-top:16px;display:flex;justify-content:flex-end;gap:8px' }, [
            E('button', { 'class': 'btn', 'click': ui.hideModal }, 'Cancel'),
            E('button', {
                'class': 'btn cbi-button-negative',
                'click': function () {
                    var pci = pciInput.value.trim();
                    var arfcn = arfcnInput.value.trim();
                    if (!pci || !arfcn) return;
                    ui.hideModal();
                    lockCell(pci, arfcn);
                }
            }, 'Lock to Cell')
        ])
    ]);
}

function nearbyCellsSection(data, widgetId) {
    var cells = Array.isArray(data.nearby_cells) ? data.nearby_cells.slice() : [];

    // Always include the active primary serving cell so the connected tower is always visible
    var servingPci = data.pci || data.pcid;
    var servingArfcn = data.arfcn;
    if (servingPci && servingArfcn && servingPci !== '--' && servingPci !== 'NA' && servingArfcn !== '--' && servingArfcn !== 'NA') {
        var alreadyPresent = false;
        for (var i = 0; i < cells.length; i++) {
            if (String(cells[i].pci) === String(servingPci) && String(cells[i].arfcn) === String(servingArfcn)) {
                cells[i].isServing = true;
                alreadyPresent = true;
                break;
            }
        }
        if (!alreadyPresent) {
            cells.unshift({
                pci: String(servingPci),
                arfcn: String(servingArfcn),
                rsrp: (data.rsrp && data.rsrp !== 'NA' && data.rsrp !== '--') ? data.rsrp : '--',
                rsrq: (data.rsrq && data.rsrq !== 'NA' && data.rsrq !== '--') ? data.rsrq : '--',
                isServing: true
            });
        }
    }

    // Also include secondary carrier (CA / SCC) if active and not already in table
    var sccPci = data.SCC_PCI;
    var sccArfcn = data.SCC_ARFCN;
    if (sccPci && sccArfcn && sccPci !== '--' && sccPci !== 'NA' && sccArfcn !== '--' && sccArfcn !== 'NA') {
        var sccPresent = false;
        for (var j = 0; j < cells.length; j++) {
            if (String(cells[j].pci) === String(sccPci) && String(cells[j].arfcn) === String(sccArfcn)) {
                if (!cells[j].isServing) cells[j].isSecondary = true;
                sccPresent = true;
                break;
            }
        }
        if (!sccPresent) {
            cells.push({
                pci: String(sccPci),
                arfcn: String(sccArfcn),
                rsrp: (data.SCC_RSRP && data.SCC_RSRP !== 'NA' && data.SCC_RSRP !== '--') ? data.SCC_RSRP : '--',
                rsrq: (data.SCC_RSRQ && data.SCC_RSRQ !== 'NA' && data.SCC_RSRQ !== '--') ? data.SCC_RSRQ : '--',
                isSecondary: true
            });
        }
    }

    cells.sort(function (a, b) {
        if (a.isServing) return -1;
        if (b.isServing) return 1;
        if (a.isSecondary && !b.isSecondary) return -1;
        if (!a.isSecondary && b.isSecondary) return 1;
        return parseFloat(b.rsrp) - parseFloat(a.rsrp);
    });

    var lockStatus = data.cell_lock_status || 'UNKNOWN';
    var isLocked = lockStatus !== 'UNLOCK' && lockStatus !== 'UNKNOWN';
    var statusBadge = E('span', {
        'class': 'jodu-badge',
        'style': isLocked ? 'background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);' : 'background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);'
    }, isLocked ? 'LOCKED (' + lockStatus + ')' : 'UNLOCKED (AUTO)');

    var actionBtns = [];
    if (isLocked) {
        actionBtns.push(E('button', {
            'class': 'btn cbi-button-positive',
            'style': 'font-size:0.8em;padding:4px 10px;border-radius:4px;margin-right:6px;display:inline-flex;align-items:center;gap:4px;',
            'click': unlockCell
        }, [
            svgIcon('unlock', 12, '#fff'),
            'Unlock'
        ]));
    }
    actionBtns.push(E('button', {
        'class': 'btn jodu-btn-sm',
        'click': function () { manualLockModal(servingPci, servingArfcn); }
    }, [
        svgIcon('lock', 12, '#94a3b8'),
        'Manual Lock'
    ]));

    var statusRow = E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;' }, [
        E('div', { 'style': 'color:#94a3b8;font-size:0.85em;display:flex;align-items:center;gap:6px;' }, [
            'Lock State: ', statusBadge
        ]),
        E('div', { 'style': 'display:flex;gap:6px;' }, actionBtns)
    ]);
    if (!cells.length) {
        return panel('Nearby Cells & Tower Scan', E('div', {}, [
            statusRow,
            E('p', { 'style': 'color:#64748b;font-size:0.88em;padding:12px 0;' }, 'No neighbouring cells detected in current sector scan. Use Manual Lock to bind to a specific tower.')
        ]), svgIcon('radar', 15, '#38bdf8'), null, widgetId);
    }
    var headerRow = E('tr', { 'class': 'jodu-th-tr' }, [
        E('th', { 'class': 'jodu-th' }, 'PCI'),
        E('th', { 'class': 'jodu-th' }, 'ARFCN'),
        E('th', { 'class': 'jodu-th', 'style': 'text-align:right' }, 'RSRP'),
        E('th', { 'class': 'jodu-th', 'style': 'text-align:right' }, 'RSRQ'),
        E('th', { 'class': 'jodu-th', 'style': 'text-align:right' }, 'Action')
    ]);
    var rows = cells.map(function (c) {
        var color = qualityColor('rsrp', c.rsrp);
        var pciDisplay = [E('span', { 'style': 'font-weight:700;' }, c.pci)];
        if (c.isServing) {
            pciDisplay.push(E('span', {
                'class': 'jodu-badge',
                'style': 'margin-left:6px;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.68em;'
            }, 'Serving (PCC)'));
        } else if (c.isSecondary) {
            pciDisplay.push(E('span', {
                'class': 'jodu-badge',
                'style': 'margin-left:6px;background:rgba(168,85,247,0.15);color:#c084fc;border:1px solid rgba(168,85,247,0.3);font-size:0.68em;'
            }, 'Secondary (SCC)'));
        }
        return E('tr', { 'class': 'jodu-tr' }, [
            E('td', { 'class': 'jodu-td-lbl' }, pciDisplay),
            E('td', { 'class': 'jodu-td-lbl' }, c.arfcn),
            E('td', { 'class': 'jodu-td-val', 'style': 'color:' + color + ';font-weight:600;' }, c.rsrp + (c.rsrp !== '--' && c.rsrp !== 'NA' ? ' dBm' : '')),
            E('td', { 'class': 'jodu-td-val', 'style': 'color:#94a3b8;' }, c.rsrq + (c.rsrq !== '--' && c.rsrq !== 'NA' ? ' dB' : '')),
            E('td', { 'class': 'jodu-td-val', 'style': 'text-align:right' }, [
                c.isServing ?
                    E('span', {
                        'class': 'jodu-badge',
                        'style': 'background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);font-size:0.72em;padding:3px 7px;font-weight:600;'
                    }, 'ACTIVE') :
                    E('button', {
                        'class': 'btn jodu-btn-sm',
                        'click': (function (pci, arfcn) { return function () { lockCell(pci, arfcn); }; })(c.pci, c.arfcn)
                    }, 'Lock')
            ])
        ]);
    });
    var table = E('div', { 'style': 'max-height:280px;overflow-y:auto' }, [
        E('table', { 'class': 'jodu-table' }, [headerRow].concat(rows))
    ]);
    return panel('Nearby Cells & Tower Scan (' + cells.length + ' Towers)', E('div', {}, [statusRow, table]), svgIcon('radar', 15, '#38bdf8'), null, widgetId);
}

function rebootOdu() {
    ui.showModal('Reboot 5G ODU?', [
        E('p', {}, 'This will reboot the ODU modem. Internet connectivity will drop for a minute or two while it re-initializes and syncs with the cell tower.'),
        E('div', { 'class': 'right', 'style': 'margin-top:16px;display:flex;justify-content:flex-end;gap:8px' }, [
            E('button', { 'class': 'btn', 'click': ui.hideModal }, 'Cancel'),
            E('button', {
                'class': 'btn cbi-button-negative',
                'click': function () {
                    ui.hideModal();
                    rebootState.inProgress = true;
                    rebootState.sawOffline = false;
                    notify('Reboot command sent to ODU. Monitoring recovery...', 'info', 4000);
                    if (triggerRefresh) triggerRefresh();
                    fs.exec_direct('/usr/libexec/jodu5164x-reboot.sh', []).catch(function () { });
                    setTimeout(function () {
                        if (rebootState.inProgress) {
                            rebootState.inProgress = false;
                            if (triggerRefresh) triggerRefresh();
                        }
                    }, 180000);
                }
            }, 'Reboot Now')
        ])
    ]);
}

function ethSpeedColor(mbps) {
    var v = parseFloat(mbps);
    if (isNaN(v) || v <= 0) return COLOR_NEUTRAL;
    if (v >= 2500) return COLOR_PURPLE;
    if (v >= 1000) return COLOR_GOOD;
    return COLOR_POOR;
}

function ethSpeedSuggestion(mbps) {
    var v = parseFloat(mbps);
    if (isNaN(v) || v <= 0 || v >= 1000) return '';
    return 'Link negotiated at ' + v + ' Mbps. Use a Cat6+ Ethernet cable or Gigabit port to achieve 1 Gbps+ speeds.';
}

function cdtPairBadge(p) {
    var isOk = (String(p.status).toLowerCase() === 'normal');
    var color = isOk ? COLOR_GOOD : COLOR_POOR;
    var bg = isOk ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.12)';
    var border = isOk ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.32)';
    var pairName = (p.pair === '1-2' ? 'Pair 1-2 (Data)' : (p.pair === '3-6' ? 'Pair 3-6 (Data)' : (p.pair === '4-5' ? 'Pair 4-5 (PoE)' : 'Pair 7-8 (PoE)')));
    var faultInfo = (p.fault && p.fault !== 'none') ? ' @ ' + p.fault + 'm' : '';
    var statusText = isOk ? 'Normal' : (String(p.status).toUpperCase() + faultInfo);

    return E('div', {
        'class': 'jodu-cdt-pair-card',
        'style': 'background:' + bg + ';border:1px solid ' + border + ';border-radius:4px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;'
    }, [
        E('div', {}, [
            E('div', { 'style': 'font-size:0.75em;color:#94a3b8;font-weight:600;' }, pairName),
            E('div', { 'style': 'font-size:0.88em;color:' + color + ';font-weight:700;display:flex;align-items:center;gap:5px;margin-top:2px;' }, [
                colorDot(color),
                statusText
            ])
        ]),
        E('div', { 'style': 'text-align:right;' }, [
            E('div', { 'style': 'font-size:0.70em;color:#64748b;' }, 'Est. Run'),
            E('div', { 'style': 'font-size:0.90em;color:#e2e8f0;font-weight:700;' }, p.length ? (p.length + ' m') : '--')
        ])
    ]);
}

function ethSection(data, widgetId) {
    var speedColor = ethSpeedColor(data.eth_speed);
    var rows = [
        paramRow('Link Status', data.eth_link_status, data.eth_link_status === 'Up' ? COLOR_GOOD : COLOR_POOR),
        paramRow('Speed', formatSpeed(data.eth_speed), speedColor),
        paramRow('Duplex', data.eth_duplex)
    ];
    var table = E('table', { 'class': 'jodu-table' }, rows);
    var children = [table];

    if (data.cdt && data.cdt.pairs && data.cdt.pairs.length) {
        var allOk = data.cdt.pairs.every(function (p) { return String(p.status).toLowerCase() === 'normal'; });
        var avgLen = data.cdt.pairs[0] ? data.cdt.pairs[0].length : null;
        var lenStr = avgLen ? (' · ~' + avgLen + ' m') : '';
        var cdtBadge = E('span', {
            'class': 'jodu-badge',
            'style': allOk ? 'background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);font-size:0.72em;' : 'background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);font-size:0.72em;'
        }, allOk ? ('PASS: Pairs A-D (Normal)' + lenStr) : 'FAULT: Cable Issue');

        var toggleBtn = E('button', {
            'class': 'btn jodu-btn-sm',
            'style': 'background:#1e293b;color:#cbd5e1;border:1px solid #334155;font-size:0.74em;cursor:pointer;padding:3px 8px;',
            'click': function (ev) {
                ev.preventDefault();
                cdtExpanded = !cdtExpanded;
                var detailsNode = ev.target.closest('.jodu-cdt-section').querySelector('.jodu-cdt-details');
                if (detailsNode) {
                    detailsNode.style.display = cdtExpanded ? 'block' : 'none';
                }
                ev.target.textContent = cdtExpanded ? '▴ Hide Details' : '▾ Details & Pinout';
            }
        }, cdtExpanded ? '▴ Hide Details' : '▾ Details & Pinout');

        var cdtHeader = E('div', {
            'style': 'margin:14px 0 8px;padding-top:10px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;'
        }, [
            E('div', { 'style': 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' }, [
                E('span', { 'style': 'font-size:0.82em;font-weight:700;letter-spacing:0.04em;color:#cbd5e1;' }, 'CABLE DIAGNOSTICS (CDT)'),
                cdtBadge
            ]),
            toggleBtn
        ]);

        var cdtGrid = E('div', {
            'style': 'display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;margin-bottom:8px;margin-top:8px;'
        }, data.cdt.pairs.map(cdtPairBadge));

        var cdtNote = E('div', {
            'style': 'font-size:0.78em;color:#94a3b8;line-height:1.45;margin-bottom:8px;background:#0d1522;border:1px solid #1e293b;border-radius:4px;padding:9px 12px;'
        }, [
            E('div', { 'style': 'display:flex;align-items:flex-start;gap:8px;' }, [
                svgIcon('cable', 15, '#38bdf8'),
                E('div', {}, [
                    E('strong', { 'style': 'color:#38bdf8;' }, 'Cable Diagnostics: '),
                    'Estimated cable length is an electrical measurement (TDR) and may report longer than physical due to passive PoE circuitry. ',
                    E('strong', { 'style': 'color:#34d399;' }, 'Wire pair health status is hardware-verified'),
                    ' by the PHY, guaranteeing pin continuity for Gigabit data and PoE power.'
                ])
            ])
        ]);

        var cdtDetails = E('div', {
            'class': 'jodu-cdt-details',
            'style': 'display:' + (cdtExpanded ? 'block' : 'none') + ';'
        }, [cdtGrid, cdtNote]);

        var cdtSection = E('div', { 'class': 'jodu-cdt-section' }, [cdtHeader, cdtDetails]);
        children.push(cdtSection);
    }

    var speedSuggestion = ethSpeedSuggestion(data.eth_speed);
    if (speedSuggestion) {
        children.push(E('div', { 'class': 'jodu-alert-box', 'style': 'background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#f87171;' }, speedSuggestion));
    }
    var uptimeSec = parseInt(data.odu_uptime_sec, 10);
    if (!isNaN(uptimeSec) && uptimeSec > 86400 * 7) {
        children.push(E('div', { 'class': 'jodu-alert-box', 'style': 'background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:#fbbf24;' }, 'High ODU uptime (' + formatUptime(data.odu_uptime_sec) + '). A periodic reboot improves 5G stability.'));
    }
    children.push(E('div', { 'style': 'margin-top:14px' }, [
        E('button', {
            'class': 'btn cbi-button-negative',
            'style': 'width:100%;padding:8px;border-radius:4px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;',
            'click': rebootOdu
        }, [
            svgIcon('refresh', 13, '#fff'),
            'Reboot 5G ODU'
        ])
    ]));
    return panel('ODU Management & Hardware Control', E('div', {}, children), svgIcon('cable', 15, '#38bdf8'), null, widgetId);
}

function parseDataSize(str) {
    if (!str) return null;
    var m = String(str).match(/^([\d.]+)\s*([KMGT]?B)$/i);
    if (!m) return null;
    var num = parseFloat(m[1]);
    var unit = m[2].toUpperCase();
    var mult = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 }[unit];
    if (!mult) return null;
    return num * mult;
}

function formatBytes(n) {
    if (n == null || isNaN(n)) return '--';
    if (n < 1024) return n.toFixed(0) + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(2) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

var dataUsageHistory = [];
var DATA_HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
var DATA_HISTORY_MIN_GAP_MS = 60 * 1000;

function pushDataUsageHistory(totalBytes) {
    if (totalBytes == null || isNaN(totalBytes)) return;
    var now = Date.now();
    var last = dataUsageHistory[dataUsageHistory.length - 1];
    if (!last || (now - last.ts) >= DATA_HISTORY_MIN_GAP_MS) {
        dataUsageHistory.push({ ts: now, total: totalBytes });
        var cutoff = now - DATA_HISTORY_MAX_AGE_MS;
        while (dataUsageHistory.length && dataUsageHistory[0].ts < cutoff) {
            dataUsageHistory.shift();
        }
    }
}

function usageInWindow(totalBytes, windowMs) {
    if (totalBytes == null || isNaN(totalBytes) || !dataUsageHistory.length) return null;
    var now = Date.now();
    var targetTs = now - windowMs;
    var candidate = null;
    for (var i = 0; i < dataUsageHistory.length; i++) {
        if (dataUsageHistory[i].ts >= targetTs) {
            candidate = dataUsageHistory[i];
            break;
        }
    }
    if (!candidate) candidate = dataUsageHistory[0];
    var delta = totalBytes - candidate.total;
    if (delta < 0) delta = 0;
    return { bytes: delta, fullWindow: dataUsageHistory[0].ts <= targetTs, elapsedMs: now - dataUsageHistory[0].ts };
}

function formatShortDuration(sec) {
    if (sec < 60) return Math.round(sec) + 's';
    if (sec < 3600) return Math.round(sec / 60) + 'm';
    if (sec < 86400) return (sec / 3600).toFixed(1) + 'h';
    return (sec / 86400).toFixed(1) + 'd';
}

function dataUsageSection(data, widgetId) {
    var sentBytes = parseDataSize(data.data_sent);
    var receivedBytes = parseDataSize(data.data_received);
    var totalBytes = (sentBytes != null && receivedBytes != null) ? (sentBytes + receivedBytes) : null;
    pushDataUsageHistory(totalBytes);
    var rows = [
        paramRow('Data Uploaded', data.data_sent),
        paramRow('Data Downloaded', data.data_received),
        paramRow('Packet Loss', data.packet_loss, parseFloat(data.packet_loss) === 0 ? COLOR_GOOD : COLOR_OK)
    ];
    var table = E('table', { 'class': 'jodu-table' }, rows);
    var note = E('div', { 'style': 'margin-top:10px;font-size:0.75em;color:#64748b;font-style:italic;' }, 'Session counters retrieved from ODU firmware.');
    var windows = [
        { label: 'Last 5 min', ms: 5 * 60 * 1000, color: COLOR_BLUE },
        { label: 'Last 1 hour', ms: 60 * 60 * 1000, color: COLOR_GOOD },
        { label: 'Last 5 hours', ms: 5 * 60 * 60 * 1000, color: COLOR_OK },
        { label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000, color: COLOR_PURPLE }
    ];
    var historyRows = windows.map(function (w) {
        var result = usageInWindow(totalBytes, w.ms);
        var display = 'sampling...';
        var color = COLOR_NEUTRAL;
        if (result != null) {
            display = formatBytes(result.bytes);
            if (!result.fullWindow) {
                display += ' (' + formatShortDuration(result.elapsedMs / 1000) + ')';
            }
            color = w.color;
        }
        return paramRow(w.label, display, color);
    });
    var historyTable = E('table', { 'class': 'jodu-table', 'style': 'margin-top:8px;' }, historyRows);
    return panel('Data Usage & Bandwidth Tracker', E('div', {}, [table, note, subheading('Usage Over Time'), historyTable]), svgIcon('speed', 15, '#38bdf8'), null, widgetId);
}

function tempColor(celsius) {
    var v = parseFloat(celsius);
    if (isNaN(v)) return COLOR_NEUTRAL;
    if (v <= 45) return COLOR_GOOD;
    if (v <= 62) return COLOR_OK;
    return COLOR_POOR;
}

var SENSOR_NAME_MAP = {
    'cpu': 'CPU Core', 'cpuss': 'CPU Subsystem', 'gpu': 'GPU Core', 'modem': '5G Modem',
    'mdmss': 'Modem Subsystem', 'mdmq6': 'Modem DSP (Q6)', 'aoss': 'Always-On Subsystem',
    'lte': 'LTE Transceiver', 'sub6': 'Sub-6 GHz RF', 'ambient': 'Chassis Ambient',
    'pa': 'Power Amplifier', 'pa0': 'Power Amplifier 0', 'pa1': 'Power Amplifier 1',
    'pa2': 'Power Amplifier 2', 'sdr': 'SDR Transceiver', 'sdr0': 'SDR Transceiver 0',
    'sdr1': 'SDR Transceiver 1', 'mmw': 'mmWave RFIC', 'mmw0': 'mmWave RFIC 0',
    'ific': 'IFIC Subsystem', 'ific0': 'IFIC 0'
};

function friendlySensorName(rawType, fallbackZone) {
    if (!rawType) return fallbackZone || 'Sensor';
    var tokens = rawType.split('-').filter(function (t) { return t && t.toLowerCase() !== 'usr'; });
    if (!tokens.length) return rawType;
    var words = tokens.map(function (tok) {
        var key = tok.toLowerCase();
        if (SENSOR_NAME_MAP[key]) return SENSOR_NAME_MAP[key];
        return tok.charAt(0).toUpperCase() + tok.slice(1);
    });
    return words.join(' ');
}

function usagePctColor(pct) {
    var v = parseFloat(pct);
    if (isNaN(v)) return COLOR_NEUTRAL;
    if (v <= 60) return COLOR_GOOD;
    if (v <= 85) return COLOR_OK;
    return COLOR_POOR;
}

function usageBar(pct, color) {
    var v = parseFloat(pct);
    var width = isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
    return E('div', { 'class': 'jodu-bar-track' }, [
        E('div', { 'class': 'jodu-bar-fill', 'style': 'width:' + width + '%;background:' + color + ';' }, '')
    ]);
}

function formatKbAsMb(kb) {
    var v = parseFloat(kb);
    if (isNaN(v)) return null;
    return (v / 1024).toFixed(0);
}

var cpuHistory = [];
var memHistory = [];
var HISTORY_MAX = 300;

function pushCpuHistory(pct) {
    var v = parseFloat(pct);
    cpuHistory.push(isNaN(v) ? 0 : v);
    if (cpuHistory.length > HISTORY_MAX) cpuHistory.shift();
}

function pushMemHistory(pct) {
    var v = parseFloat(pct);
    memHistory.push(isNaN(v) ? 0 : v);
    if (memHistory.length > HISTORY_MAX) memHistory.shift();
}

function circleGauge(pct, color, size) {
    size = size || 120;
    var stroke = 8;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var v = parseFloat(pct);
    var frac = isNaN(v) ? 0 : Math.max(0, Math.min(100, v)) / 100;
    var offset = c * (1 - frac);
    var mid = size / 2;
    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;margin:0 auto;">' +
        '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="#1e293b" stroke-width="' + stroke + '"/>' +
        '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" transform="rotate(-90 ' + mid + ' ' + mid + ')" style="transition:stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease;"/></svg>';
    var wrap = E('div', { 'style': 'position:relative;width:' + size + 'px;height:' + size + 'px;margin:8px auto;' });
    wrap.innerHTML = svg;
    return wrap;
}

function gaugeWithLabel(pct, color, size, big, small) {
    var g = circleGauge(pct, color, size);
    var label = E('div', { 'class': 'jodu-gauge-center' }, [
        E('div', { 'class': 'jodu-gauge-val', 'style': 'color:' + color }, big),
        small ? E('div', { 'class': 'jodu-gauge-sub' }, small) : ''
    ]);
    g.appendChild(label);
    return g;
}

function sparkline(history, color, width, height) {
    width = width || 240;
    height = height || 40;
    if (!history.length) {
        return E('div', { 'style': 'height:' + height + 'px' });
    }
    var max = 100;
    var step = history.length > 1 ? width / (history.length - 1) : width;
    var pts = [];
    for (var i = 0; i < history.length; i++) {
        var x = (i * step).toFixed(1);
        var y = (height - (history[i] / max) * (height - 8) - 4).toFixed(1);
        pts.push(x + ',' + y);
    }
    var polyline = pts.join(' ');
    var areaPts = '0,' + height + ' ' + polyline + ' ' + width + ',' + height;
    var gradId = 'spk-grad-' + Math.random().toString(36).substr(2, 6);
    var svg = '<svg width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" style="display:block;overflow:visible;">' +
        '<defs>' +
        '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.25"/>' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.0"/>' +
        '</linearGradient>' +
        '</defs>' +
        '<polygon points="' + areaPts + '" fill="url(#' + gradId + ')"/>' +
        '<polyline points="' + polyline + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var wrap = E('div', { 'style': 'width:100%;border-radius:4px;overflow:hidden;margin-top:6px;' });
    wrap.innerHTML = svg;
    return wrap;
}

function statLine(label, value) {
    return E('div', { 'class': 'jodu-stat-row' }, [
        E('span', { 'class': 'jodu-stat-lbl' }, label),
        E('span', { 'class': 'jodu-stat-val' }, value)
    ]);
}

function subheading(text) {
    return E('div', { 'class': 'jodu-subheading' }, text);
}

function cpuGaugePanel(data, widgetId) {
    pushCpuHistory(data.odu_cpu_pct);
    var cores = (data.odu_cpu_cores && data.odu_cpu_cores !== '--') ? data.odu_cpu_cores : null;
    var color = usagePctColor(data.odu_cpu_pct);
    var pctDisplay = (data.odu_cpu_pct != null && data.odu_cpu_pct !== '--') ? data.odu_cpu_pct + '%' : 'NA';
    var title = (data.odu_cpu_model && data.odu_cpu_model !== 'Unknown' ? data.odu_cpu_model : 'CPU') +
        (cores ? ' (' + cores + 'C/' + cores + 'T)' : '');
    var content = E('div', {}, [
        gaugeWithLabel(data.odu_cpu_pct, color, 120, pctDisplay, cores ? cores + ' Cores' : null),
        statLine('Cores / Threads', cores ? (cores + 'C / ' + cores + 'T') : 'NA'),
        statLine('Tasks (Run/Total)', (data.odu_tasks_running !== '--' ? data.odu_tasks_running : 'NA') + ' / ' + (data.odu_tasks_total !== '--' ? data.odu_tasks_total : 'NA')),
        subheading('System Status'),
        statLine('Load Average', [data.odu_load1, data.odu_load5, data.odu_load15].join(', ')),
        statLine('Uptime', formatUptime(data.odu_uptime_sec)),
        subheading('Usage History (5 min)'),
        sparkline(cpuHistory, color)
    ]);
    return panel(title, content, svgIcon('cpu', 15, '#38bdf8'), null, widgetId);
}

function memGaugePanel(data, widgetId) {
    pushMemHistory(data.odu_mem_pct);
    var color = usagePctColor(data.odu_mem_pct);
    var pctDisplay = (data.odu_mem_pct != null && data.odu_mem_pct !== '--') ? data.odu_mem_pct + '%' : 'NA';
    var usedMb = formatKbAsMb(data.odu_mem_used_kb);
    var totalMb = formatKbAsMb(data.odu_mem_total_kb);
    var freeMb = formatKbAsMb(data.odu_mem_free_kb);
    var cachedMb = formatKbAsMb(data.odu_mem_cached_kb);
    var buffersMb = formatKbAsMb(data.odu_mem_buffers_kb);
    var swapTotalMb = formatKbAsMb(data.odu_mem_swap_total_kb);
    var swapUsedMb = formatKbAsMb(data.odu_mem_swap_used_kb);
    var ramNote = '';
    if (totalMb != null) {
        if (totalMb >= 600) {
            ramNote = E('div', { 'class': 'jodu-alert-box', 'style': 'background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);color:#60a5fa;' }, 'This ODU supports 2.5 Gigabit Ethernet.');
        } else if (totalMb < 200) {
            ramNote = E('div', { 'class': 'jodu-alert-box', 'style': 'background:#0a0e17;border:1px solid #1e293b;color:#94a3b8;' }, 'This ODU supports 1 Gigabit Ethernet.');
        }
    }
    var content = E('div', {}, [
        gaugeWithLabel(data.odu_mem_pct, color, 120, pctDisplay, usedMb != null ? usedMb + ' MB' : null),
        statLine('Physical Total', totalMb != null ? totalMb + ' MB' : 'NA'),
        statLine('Used', usedMb != null ? usedMb + ' MB' : 'NA'),
        statLine('Free', freeMb != null ? freeMb + ' MB' : 'NA'),
        statLine('Cached', cachedMb != null ? cachedMb + ' MB' : 'NA'),
        statLine('Buffers', buffersMb != null ? buffersMb + ' MB' : 'NA'),
        statLine('Swap', (swapUsedMb != null && swapTotalMb != null) ? (swapUsedMb + ' / ' + swapTotalMb + ' MB') : 'NA'),
        ramNote,
        subheading('Usage History (5 min)'),
        sparkline(memHistory, color)
    ]);
    return panel('Memory (RAM)', content, svgIcon('ram', 15, '#38bdf8'), null, widgetId);
}

function cpuLoadBar(label, pct) {
    var v = parseFloat(pct);
    var display = isNaN(v) ? 'NA' : v.toFixed(1) + '%';
    var color = usagePctColor(label === 'Idle' ? (100 - (isNaN(v) ? 0 : v)) : pct);
    return E('div', { 'style': 'margin-bottom:10px;' }, [
        E('div', { 'style': 'display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:3px;' }, [
            E('span', { 'style': 'color:#94a3b8;' }, label),
            E('span', { 'style': 'font-weight:700;color:' + color }, display)
        ]),
        usageBar(isNaN(v) ? 0 : v, color)
    ]);
}

function cpuDetailPanel(data, widgetId) {
    var content = E('div', {}, [
        cpuLoadBar('Idle (Available)', data.odu_cpu_idle),
        cpuLoadBar('User Space', data.odu_cpu_user),
        cpuLoadBar('System Kernel', data.odu_cpu_system),
        cpuLoadBar('I/O Wait', data.odu_cpu_iowait),
        cpuLoadBar('Hardware IRQ', data.odu_cpu_irq),
        cpuLoadBar('Software IRQ', data.odu_cpu_softirq),
        E('div', { 'style': 'margin-top:12px;border-top:1px solid #1e293b;padding-top:6px;' }, [
            statLine('System Tasks', (data.odu_tasks_running !== '--' ? data.odu_tasks_running : 'NA') + ' / ' + (data.odu_tasks_total !== '--' ? data.odu_tasks_total : 'NA')),
            statLine('Context Switches / s', data.odu_ctxt_rate !== '--' ? data.odu_ctxt_rate + ' /s' : 'NA'),
            statLine('Hardware Interrupts / s', data.odu_intr_rate !== '--' ? data.odu_intr_rate + ' /s' : 'NA'),
            statLine('Active Connections', (data.odu_conntrack_count !== '--' && data.odu_conntrack_max !== '--') ? (data.odu_conntrack_count + ' / ' + data.odu_conntrack_max) : 'NA')
        ])
    ]);
    return panel('CPU Detailed Breakdown', content, svgIcon('chip', 15, '#38bdf8'), null, widgetId);
}

function thermalSection(data, widgetId) {
    var zones = Array.isArray(data.thermal_zones) ? data.thermal_zones : [];
    if (!zones.length) {
        return panel('Internal Thermal Sensors', E('p', { 'style': 'color:#64748b;font-size:0.9em;padding:8px 0;' }, 'No temperature telemetry available (verify Settings).'), svgIcon('temp', 15, '#38bdf8'), null, widgetId);
    }
    var maxZone = zones.reduce(function (a, b) {
        return (parseFloat(b.temp_c) > parseFloat(a.temp_c)) ? b : a;
    }, zones[0]);
    var half = Math.ceil(zones.length / 2);
    var colA = zones.slice(0, half);
    var colB = zones.slice(half);

    function buildColumn(list) {
        var rows = list.map(function (z) {
            var label = friendlySensorName(z.type, z.zone);
            return paramRow(label, z.temp_c + ' °C', tempColor(z.temp_c));
        });
        return E('div', { 'class': 'jodu-thermal-col' }, [
            E('table', { 'class': 'jodu-table' }, rows)
        ]);
    }
    var colElements = [buildColumn(colA)];
    if (colB.length > 0) {
        colElements.push(buildColumn(colB));
    }
    var table = E('div', { 'id': 'jodu5164x-thermal-scroll', 'class': 'jodu-thermal-grid' }, colElements);
    var maxLabel = friendlySensorName(maxZone.type, maxZone.zone);
    var maxColor = tempColor(maxZone.temp_c);
    var header = E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:6px 10px;background:#0a0e17;border:1px solid #1e293b;border-radius:4px;' }, [
        E('span', { 'style': 'color:#94a3b8;font-size:0.85em;' }, zones.length + ' active sensors detected'),
        E('span', { 'class': 'jodu-badge', 'style': 'background:' + maxColor + '20;color:' + maxColor + ';border:1px solid ' + maxColor + '50;font-weight:700;' }, 'MAX: ' + maxZone.temp_c + ' °C (' + maxLabel + ')')
    ]);
    return panel('Internal Thermal Sensors', E('div', {}, [header, table]), svgIcon('temp', 15, '#38bdf8'), null, widgetId);
}

function emptyDashboardPlaceholder() {
    return E('div', { 'class': 'jodu-empty-widgets-box' }, [
        E('div', { 'style': 'margin-bottom:12px;display:flex;justify-content:center;' }, [svgIcon('customize', 32, '#64748b')]),
        E('h3', { 'style': 'margin:0 0 8px;font-size:1.3em;color:#f8fafc;' }, 'All Dashboard Widgets Are Hidden'),
        E('p', { 'style': 'color:#94a3b8;max-width:440px;margin:0 auto 20px;font-size:0.9em;line-height:1.5;' },
            'You customized the dashboard and closed all sections. You can restore widgets anytime from the Customize menu.'),
        E('button', {
            'class': 'btn cbi-button-positive',
            'style': 'padding:8px 22px;font-weight:700;border-radius:4px;',
            'click': function () {
                resetWidgetVisibility();
                notify('All widgets restored to default layout.', 'info', 3000);
                if (triggerRefresh) triggerRefresh();
            }
        }, 'Restore All Widgets')
    ]);
}

function renderDashboard(data) {
    var online = data.server_link === 'ONLINE';
    var disabled = data.server_link === 'DISABLED';

    if (disabled) {
        return E('div', { 'class': 'jodu-paused-box' }, [
            E('div', { 'style': 'margin-bottom:12px;display:flex;justify-content:center;' }, [svgIcon('pause', 32, '#64748b')]),
            E('h3', { 'style': 'margin:0 0 8px;font-size:1.3em;color:#f8fafc;' }, 'ODU Monitoring Paused'),
            E('p', { 'style': 'color:#94a3b8;max-width:480px;margin:0 auto;line-height:1.5;font-size:0.92em;' },
                'The session has been freed so you can log into the native ODU WebUI without single-login conflicts. Click "Monitoring: OFF" above when ready to resume live polling.')
        ]);
    }
    if (rebootState.inProgress) {
        if (!online) {
            rebootState.sawOffline = true;
        } else if (rebootState.sawOffline) {
            rebootState.inProgress = false;
            rebootState.sawOffline = false;
            notify('ODU is back online! Refreshing...', 'info', 3000);
            setTimeout(function () { window.location.reload(); }, 1500);
        }
    }
    var rebootBanner = rebootState.inProgress ? E('div', { 'class': 'jodu-alert-banner' }, [
        svgIcon('refresh', 13, '#38bdf8'),
        E('span', { 'style': 'margin-left:8px;' }, 'ODU is rebooting — please wait, connection will restore automatically...')
    ]) : '';

    if (!online) {
        var diagMessages = [];
        if (data.webui_message) diagMessages.push(data.webui_message);
        if (data.telnet_message) diagMessages.push(data.telnet_message);
        if (!diagMessages.length) diagMessages.push('Could not reach JODU51641/JODU51642 (' + (data.error || 'unknown error') + ').');
        var offElements = [];
        if (rebootBanner) offElements.push(rebootBanner);
        var offSum = summaryRow(data, false);
        if (offSum) offElements.push(offSum);
        offElements.push(E('div', { 'style': 'display:flex;flex-direction:column;gap:10px;margin-top:16px;' }, diagMessages.map(function (msg) {
            return E('div', { 'class': 'alert-message warning' }, msg);
        })));
        return E('div', {}, offElements);
    }

    var merged = Object.assign({}, data, {
        'scc_band': data.SCC_BAND,
        'scc_bw': data.SCC_BW,
        'scc_arfcn': data.SCC_ARFCN,
        'scc_pci': data.SCC_PCI,
        'scc_bler': data.SCC_BLER,
        'scc_mimo': data.SCC_MIMO,
        'scc_modulation': data.SCC_MODULATION,
        'scc_rsrp': data.SCC_RSRP,
        'scc_rsrq': data.SCC_RSRQ,
        'scc_sinr': data.SCC_SINR
    });

    var noSim = data.sim_status === 'missing';
    var primaryCellContent = noSim ? E('div', { 'class': 'jodu-idle-panel' }, [
        E('div', { 'style': 'margin-bottom:8px;display:flex;justify-content:center;' }, [svgIcon('cell', 28, '#f87171')]),
        E('h4', { 'style': 'margin:0;color:#f87171;font-weight:700;' }, 'No SIM Card Detected'),
        E('p', { 'style': 'margin:4px 0 0;color:#94a3b8;font-size:0.88em;' }, 'Please insert a pSIM or activate eSIM profile on your ODU.')
    ]) : cellTable('', merged);

    var sumRow = summaryRow(data, true);

    var cellPanels = buildAutoGrid([
        isWidgetVisible('primary_cell') ? panel('Cellular Parameters (Primary Cell)', primaryCellContent, svgIcon('cell', 15, '#38bdf8'), null, 'primary_cell') : null,
        isWidgetVisible('secondary_cell') ? secondaryCellPanel(merged, 'secondary_cell') : null
    ]);

    var managementColumn = buildAutoGrid([
        isWidgetVisible('eth_mgmt') ? ethSection(data, 'eth_mgmt') : null,
        isWidgetVisible('nearby_cells') ? nearbyCellsSection(data, 'nearby_cells') : null
    ]);

    var gaugePanels = buildAutoGrid([
        isWidgetVisible('cpu_gauge') ? cpuGaugePanel(data, 'cpu_gauge') : null,
        isWidgetVisible('memory') ? memGaugePanel(data, 'memory') : null
    ]);

    var detailPanels = buildAutoGrid([
        isWidgetVisible('cpu_detail') ? cpuDetailPanel(data, 'cpu_detail') : null,
        isWidgetVisible('data_usage') ? dataUsageSection(data, 'data_usage') : null
    ]);

    var thermalPanel = isWidgetVisible('thermal') ? E('div', { 'style': 'margin-bottom:16px;' }, [
        thermalSection(data, 'thermal')
    ]) : null;

    var telnetNotice = '';
    if (data.telnet_status && data.telnet_status !== 'ok') {
        var isUserReq = data.telnet_status === 'username_required';
        var bannerTitle = isUserReq ? 'Telnet Username Required' : (data.telnet_status === 'unreachable' ? 'Telnet Service Unreachable' : 'Telnet Authentication Failed');
        var bannerDesc = data.telnet_message || (isUserReq ? 'This ODU prompts for a username first (e.g. root on d2). Click Settings to enter your Telnet Username.' : 'Telnet login failed. Check your Telnet credentials in Settings.');

        telnetNotice = E('div', {
            'style': 'background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;'
        }, [
            E('div', { 'style': 'display:flex;align-items:center;gap:12px;' }, [
                svgIcon('chip', 20, '#f87171'),
                E('div', {}, [
                    E('div', { 'style': 'color:#f87171;font-weight:700;font-size:0.94em;margin-bottom:2px;' }, bannerTitle),
                    E('div', { 'style': 'color:#cbd5e1;font-size:0.84em;line-height:1.45;' }, bannerDesc)
                ])
            ]),
            E('button', {
                'class': 'btn jodu-btn-sm',
                'style': 'background:#0369a1;border-color:#0284c7;color:#ffffff;font-size:0.84em;font-weight:600;padding:6px 14px;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;',
                'click': function () {
                    if (openSettings) openSettings();
                }
            }, [
                svgIcon('settings', 13, '#fff'),
                'Configure Settings'
            ])
        ]);
    }

    var hasAnyWidget = (sumRow != null) || (cellPanels != null) || (managementColumn != null) ||
        (gaugePanels != null) || (detailPanels != null) || (thermalPanel != null);

    var mainChildren = [];
    if (rebootBanner) mainChildren.push(rebootBanner);
    if (telnetNotice) mainChildren.push(telnetNotice);

    if (!hasAnyWidget) {
        mainChildren.push(emptyDashboardPlaceholder());
    } else {
        if (sumRow) mainChildren.push(sumRow);
        var discoverBanner = buildDiscoverBanner();
        if (discoverBanner) mainChildren.push(discoverBanner);
        if (cellPanels) mainChildren.push(cellPanels);
        if (managementColumn) mainChildren.push(managementColumn);
        if (gaugePanels) mainChildren.push(gaugePanels);
        if (detailPanels) mainChildren.push(detailPanels);
        if (thermalPanel) mainChildren.push(thermalPanel);
    }

    return E('div', { 'class': 'jodu-container' }, mainChildren);
}

function loadingPlaceholder() {
    return E('div', { 'class': 'jodu-loading-box' }, [
        E('div', { 'class': 'jodu-spinner' }),
        E('h4', { 'style': 'margin:14px 0 4px;color:#f8fafc;font-weight:600;' }, 'Connecting to ODU...'),
        E('p', { 'style': 'margin:0;color:#64748b;font-size:0.85em;' }, 'Retrieving real-time radio metrics and hardware telemetry')
    ]);
}

return view.extend({
    load: function () {
        return uci.load('jodu5164x');
    },

    render: function () {
        var container = E('div', { 'id': 'jodu5164x-status-container' }, loadingPlaceholder());
        var lastStatusData = null;

        function refreshNow() {
            return fetchStatus().then(function (newData) {
                lastStatusData = newData;
                var scrollEl = document.getElementById('jodu5164x-thermal-scroll');
                var savedScrollTop = scrollEl ? scrollEl.scrollTop : null;
                var refreshed = renderDashboard(newData);
                dom.content(container, refreshed);
                if (savedScrollTop !== null) {
                    var newScrollEl = document.getElementById('jodu5164x-thermal-scroll');
                    if (newScrollEl) newScrollEl.scrollTop = savedScrollTop;
                }
                if (typeof updateToggleBtn === 'function') updateToggleBtn(newData);
                if (aimingSession.active) {
                    if (!document.getElementById('jodu-aiming-modal-root')) {
                        closeAimingModal();
                    } else if (typeof updateAimingModal === 'function') {
                        updateAimingModal(newData);
                    }
                }
            });
        }

        function modalSection(title, icon, children) {
            return E('div', { 'class': 'jodu-modal-sec' }, [
                E('div', { 'class': 'jodu-modal-sec-title' }, [
                    icon ? E('span', { 'style': 'margin-right:6px;' }, icon) : '',
                    title
                ]),
                E('div', { 'class': 'jodu-modal-sec-body' }, children)
            ]);
        }

        function field(label, inputEl, hint) {
            var children = [
                E('label', { 'class': 'jodu-modal-label' }, label),
                inputEl
            ];
            if (hint) {
                children.push(E('div', { 'class': 'jodu-modal-hint' }, hint));
            }
            return E('div', { 'class': 'jodu-modal-field' }, children);
        }

        function showCustomizeModal() {
            var checkboxMap = {};

            var items = WIDGET_CATALOG.map(function (w) {
                var isChecked = isWidgetVisible(w.id);
                var cb = E('input', { 'type': 'checkbox', 'checked': isChecked || null });
                checkboxMap[w.id] = cb;

                return E('label', { 'class': 'jodu-widget-item' }, [
                    E('div', { 'style': 'display:flex;align-items:center;gap:12px;' }, [
                        cb,
                        svgIcon(w.icon, 18, '#38bdf8'),
                        E('div', { 'style': 'flex:1;' }, [
                            E('div', { 'style': 'font-weight:700;color:#f8fafc;font-size:0.92em;' }, w.name),
                            E('div', { 'style': 'color:#94a3b8;font-size:0.8em;margin-top:2px;' }, w.desc)
                        ])
                    ])
                ]);
            });

            var quickActions = E('div', {
                'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding:8px 12px;background:#0a0e17;border-radius:4px;border:1px solid #1e293b;flex-wrap:wrap;gap:8px;'
            }, [
                E('span', { 'style': 'font-size:0.82em;color:#94a3b8;' }, 'Toggle sections on or off to personalize your dashboard layout:'),
                E('div', { 'style': 'display:flex;gap:8px;' }, [
                    E('button', {
                        'class': 'btn jodu-btn-sm',
                        'click': function () {
                            WIDGET_CATALOG.forEach(function (w) {
                                if (checkboxMap[w.id]) checkboxMap[w.id].checked = true;
                            });
                        }
                    }, 'Show All'),
                    E('button', {
                        'class': 'btn jodu-btn-sm',
                        'click': function () {
                            WIDGET_CATALOG.forEach(function (w) {
                                if (checkboxMap[w.id]) checkboxMap[w.id].checked = false;
                            });
                        }
                    }, 'Hide All')
                ])
            ]);

            var footer = E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-top:18px;flex-wrap:wrap;gap:8px;' }, [
                E('button', {
                    'class': 'btn cbi-button-neutral',
                    'click': function () {
                        resetWidgetVisibility();
                        ui.hideModal();
                        notify('Widgets reset to defaults.', 'info', 3000);
                        if (triggerRefresh) triggerRefresh();
                    }
                }, 'Reset Defaults'),
                E('div', { 'style': 'display:flex;gap:8px;' }, [
                    E('button', { 'class': 'btn', 'click': ui.hideModal }, 'Cancel'),
                    E('button', {
                        'class': 'btn cbi-button-positive',
                        'click': function () {
                            var newVis = {};
                            WIDGET_CATALOG.forEach(function (w) {
                                if (checkboxMap[w.id]) {
                                    newVis[w.id] = !!checkboxMap[w.id].checked;
                                }
                            });
                            try {
                                if (typeof localStorage !== 'undefined') {
                                    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(newVis));
                                }
                            } catch (e) { }
                            ui.hideModal();
                            notify('Dashboard layout updated.', 'info', 3000);
                            if (triggerRefresh) triggerRefresh();
                        }
                    }, 'Save Layout')
                ])
            ]);

            ui.showModal('Customize Telemetry Widgets', [
                quickActions,
                E('div', { 'style': 'display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto;padding-right:4px;' }, items),
                footer
            ]);
        }
        openCustomizeModal = showCustomizeModal;

        function openSettingsModal() {
            uci.unload('jodu5164x');
            uci.load('jodu5164x').then(function () {
                var host = uci.get('jodu5164x', 'main', 'host') || '';
                var username = uci.get('jodu5164x', 'main', 'username') || '';
                var password = uci.get('jodu5164x', 'main', 'password') || '';
                var telnetPort = uci.get('jodu5164x', 'main', 'telnet_port') || '23';
                var telnetUser = uci.get('jodu5164x', 'main', 'telnet_username') || '';
                var telnetPass = uci.get('jodu5164x', 'main', 'telnet_password') || '';
                var rebootEnabled = uci.get('jodu5164x', 'main', 'reboot_schedule_enabled') === '1';
                var rebootTime = uci.get('jodu5164x', 'main', 'reboot_schedule_time') || '03:00';
                var pollInterval = uci.get('jodu5164x', 'main', 'poll_interval') || '3';

                var inputStyle = 'width:100%;box-sizing:border-box';
                var hostInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': host, 'style': inputStyle, 'placeholder': '192.168.225.1' });
                var userInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': username, 'style': inputStyle, 'placeholder': 'Admin' });
                var passInput = E('input', { 'type': 'password', 'class': 'cbi-input-password', 'value': password, 'style': inputStyle });
                var portInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': telnetPort, 'style': inputStyle, 'placeholder': '23' });
                var telnetUserInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': telnetUser, 'style': inputStyle, 'placeholder': 'Leave blank for d1, or enter root/admin for d2' });
                var telnetPassInput = E('input', { 'type': 'password', 'class': 'cbi-input-password', 'value': telnetPass, 'style': inputStyle, 'placeholder': 'Leave blank if none' });
                var rebootEnabledInput = E('input', { 'type': 'checkbox', 'checked': rebootEnabled || null });
                var rebootTimeInput = E('input', { 'type': 'time', 'class': 'cbi-input-text', 'value': rebootTime, 'style': inputStyle });

                var intervalOptions = [];
                for (var s = 1; s <= 10; s++) {
                    var desc = s + ' second' + (s > 1 ? 's' : '');
                    if (s === 1) desc += ' (Real-Time)';
                    else if (s === 3) desc += ' (Recommended)';
                    else if (s === 10) desc += ' (Low CPU)';
                    intervalOptions.push(E('option', { 'value': String(s) }, desc));
                }
                var intervalInput = E('select', { 'class': 'cbi-input-select', 'style': inputStyle }, intervalOptions);
                intervalInput.value = String(pollInterval);

                var errorMsg = E('div', { 'style': 'color:#ef4444;font-size:0.85em;margin-top:10px;display:none' });
                var scheduleRow = E('div', { 'style': 'display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 0;' }, [
                    rebootEnabledInput,
                    E('span', { 'style': 'color:#f8fafc;font-size:0.88em;font-weight:600;' }, 'Enable daily scheduled reboot')
                ]);

                var secWeb = modalSection('WebUI Credentials', svgIcon('globe', 14, '#38bdf8'), [
                    field('ODU IP Address', hostInput),
                    field('WebUI Username', userInput),
                    field('WebUI Password', passInput)
                ]);

                var secTelnet = modalSection('Telnet Telemetry Service', svgIcon('chip', 14, '#38bdf8'), [
                    field('Telnet Port', portInput),
                    field('Telnet Username', telnetUserInput, 'Required if your ODU prompts for a login username first (e.g. root on d2). Leave blank if ODU directly asks for password (d1).'),
                    field('Telnet Password', telnetPassInput, 'Telnet login password configured on ODU. Leave blank if none.')
                ]);

                var secPoll = modalSection('Telemetry Polling Rate', svgIcon('refresh', 14, '#38bdf8'), [
                    field('Stats Update Interval (1 - 10s)', intervalInput, 'Select how often LuCI and the background daemon query ODU radio and CPU stats')
                ]);

                var secReboot = modalSection('Automated Maintenance', svgIcon('settings', 14, '#38bdf8'), [
                    scheduleRow,
                    field('Scheduled Reboot Time', rebootTimeInput)
                ]);

                ui.showModal('ODU Configuration & Settings', [
                    secWeb,
                    secTelnet,
                    secPoll,
                    secReboot,
                    errorMsg,
                    E('div', { 'class': 'right', 'style': 'margin-top:18px;display:flex;justify-content:flex-end;gap:8px' }, [
                        E('button', { 'class': 'btn', 'click': ui.hideModal }, 'Cancel'),
                        E('button', {
                            'class': 'btn cbi-button-positive',
                            'click': ui.createHandlerFn(this, function () {
                                var args = [
                                    hostInput.value.trim(),
                                    userInput.value.trim(),
                                    passInput.value,
                                    portInput.value.trim(),
                                    telnetPassInput.value,
                                    rebootEnabledInput.checked ? '1' : '0',
                                    rebootTimeInput.value || '03:00',
                                    intervalInput.value || '3',
                                    telnetUserInput.value.trim()
                                ];
                                return fs.exec_direct('/usr/libexec/jodu5164x-set-config.sh', args).then(function (res) {
                                    if (!res || res.indexOf('OK') === -1) {
                                        throw new Error('unexpected response from config writer');
                                    }
                                    uci.unload('jodu5164x');
                                    ui.hideModal();
                                    notify('Settings saved. Update interval: ' + intervalInput.value + 's', 'info', 4000);

                                    var newInterval = parseInt(intervalInput.value, 10) || 3;
                                    if (currentPollInterval !== newInterval) {
                                        currentPollInterval = newInterval;
                                        poll.remove(refreshNow);
                                        poll.add(refreshNow, currentPollInterval);
                                    }
                                    return refreshNow();
                                }).catch(function (e) {
                                    errorMsg.style.display = 'block';
                                    errorMsg.textContent = 'Save failed: ' + e.message;
                                });
                            })
                        }, 'Save & Apply')
                    ])
                ]);
            });
        }
        openSettings = openSettingsModal;

        var audioCtx = null;
        function playAimingBeep(rsrp) {
            if (aimingSession.audioMuted) return;
            try {
                var AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                if (!audioCtx) audioCtx = new AudioContext();
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                var v = parseFloat(rsrp);
                if (isNaN(v)) return;
                var clamped = Math.max(-120, Math.min(-60, v));
                var frac = (clamped - (-120)) / 60;
                var freq = 350 + frac * 950;

                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

                gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.13);
            } catch (e) { }
        }

        function closeAimingModal() {
            aimingSession.active = false;
            if (audioCtx && audioCtx.state !== 'closed') {
                try { audioCtx.suspend(); } catch (e) { }
            }
            poll.remove(refreshNow);
            poll.add(refreshNow, currentPollInterval);
            ui.hideModal();
        }

        function openAimingModal() {
            aimingSession.active = true;
            aimingSession.startRsrp = null;
            aimingSession.peakRsrp = null;
            aimingSession.peakSinr = null;
            aimingSession.initialPci = null;

            // Accelerated 1-second real-time polling during alignment
            poll.remove(refreshNow);
            poll.add(refreshNow, 1);

            var audioToggleBtn = E('button', {
                'id': 'jodu-aim-audio-btn',
                'class': 'btn jodu-aim-btn',
                'style': aimingSession.audioMuted ? 'background:#1e293b;color:#94a3b8;border-color:#334155;' : 'background:rgba(16,185,129,0.15);color:#34d399;border-color:rgba(16,185,129,0.3);',
                'click': function () {
                    aimingSession.audioMuted = !aimingSession.audioMuted;
                    audioToggleBtn.innerHTML = '';
                    if (!aimingSession.audioMuted) {
                        audioToggleBtn.appendChild(svgIcon('sound', 12, '#34d399'));
                        audioToggleBtn.appendChild(E('span', { 'style': 'margin-left:5px;' }, 'Audio: ON'));
                        audioToggleBtn.style.background = 'rgba(16,185,129,0.15)';
                        audioToggleBtn.style.color = '#34d399';
                        audioToggleBtn.style.borderColor = 'rgba(16,185,129,0.3)';
                        if (lastStatusData) playAimingBeep(lastStatusData.rsrp);
                    } else {
                        audioToggleBtn.appendChild(svgIcon('soundOff', 12, '#94a3b8'));
                        audioToggleBtn.appendChild(E('span', { 'style': 'margin-left:5px;' }, 'Audio: OFF'));
                        audioToggleBtn.style.background = '#1e293b';
                        audioToggleBtn.style.color = '#94a3b8';
                        audioToggleBtn.style.borderColor = '#334155';
                    }
                }
            }, [
                svgIcon(aimingSession.audioMuted ? 'soundOff' : 'sound', 12, aimingSession.audioMuted ? '#94a3b8' : '#34d399'),
                E('span', { 'style': 'margin-left:5px;' }, aimingSession.audioMuted ? 'Audio: OFF' : 'Audio: ON')
            ]);

            var resetPeakBtn = E('button', {
                'class': 'btn jodu-aim-btn',
                'style': 'background:#1e293b;color:#cbd5e1;border-color:#334155;',
                'click': function () {
                    if (lastStatusData) {
                        var curR = parseFloat(lastStatusData.rsrp);
                        var curS = parseFloat(lastStatusData.sinr);
                        aimingSession.startRsrp = isNaN(curR) ? null : curR;
                        aimingSession.peakRsrp = isNaN(curR) ? null : curR;
                        aimingSession.peakSinr = isNaN(curS) ? null : curS;
                        updateAimingModal(lastStatusData);
                    } else {
                        aimingSession.startRsrp = null;
                        aimingSession.peakRsrp = null;
                        aimingSession.peakSinr = null;
                    }
                    notify('Peak memory baseline reset.', 'info', 2000);
                }
            }, [
                svgIcon('refresh', 12, '#cbd5e1'),
                E('span', { 'style': 'margin-left:5px;' }, 'Reset Peak')
            ]);

            var modalTop = E('div', { 'class': 'jodu-aiming-top' }, [
                E('div', { 'style': 'display:flex;align-items:center;gap:8px;' }, [
                    E('span', { 'class': 'jodu-pulse-dot', 'style': 'background:#38bdf8;' }),
                    E('span', { 'style': 'font-weight:700;font-size:0.85em;letter-spacing:0.06em;color:#38bdf8;' }, 'REAL-TIME 1S ALIGNMENT STREAM')
                ]),
                E('div', { 'style': 'display:flex;gap:8px;align-items:center;' }, [
                    audioToggleBtn,
                    resetPeakBtn
                ])
            ]);

            // Card 1: RSRP
            var rsrpCard = E('div', { 'class': 'jodu-aiming-card' }, [
                E('div', { 'class': 'jodu-aiming-title' }, 'PRIMARY SIGNAL STRENGTH (RSRP)'),
                E('div', { 'id': 'jodu-aim-rsrp-jumbo', 'class': 'jodu-aiming-jumbo', 'style': 'color:#94a3b8;' }, [
                    E('span', { 'id': 'jodu-aim-rsrp-val' }, '--'),
                    E('span', { 'class': 'jodu-aiming-unit' }, 'dBm')
                ]),
                E('div', { 'style': 'display:flex;justify-content:center;gap:8px;align-items:center;margin-bottom:6px;' }, [
                    E('span', { 'id': 'jodu-aim-rsrp-badge', 'class': 'jodu-badge', 'style': 'background:#1e293b;color:#94a3b8;' }, 'Sampling...'),
                    E('span', { 'id': 'jodu-aim-rsrp-delta', 'class': 'jodu-badge', 'style': 'background:#1e293b;color:#94a3b8;' }, '● 0 dBm (baseline)')
                ]),
                E('div', { 'class': 'jodu-aiming-meter-track' }, [
                    E('div', { 'id': 'jodu-aim-rsrp-fill', 'class': 'jodu-aiming-meter-fill', 'style': 'width:0%;background:#38bdf8;' }),
                    E('div', { 'id': 'jodu-aim-rsrp-peak-marker', 'class': 'jodu-aiming-peak-pointer', 'style': 'left:0%;display:none;' })
                ]),
                E('div', { 'style': 'display:flex;justify-content:space-between;font-size:0.75em;color:#64748b;margin-top:4px;' }, [
                    E('span', {}, '-120 dBm (Poor)'),
                    E('span', { 'id': 'jodu-aim-rsrp-peak', 'style': 'color:#facc15;font-weight:700;' }, 'PEAK: -- dBm'),
                    E('span', {}, '-60 dBm (Max)')
                ])
            ]);

            // Card 2: SINR
            var sinrCard = E('div', { 'class': 'jodu-aiming-card' }, [
                E('div', { 'class': 'jodu-aiming-title' }, 'RADIO PURITY & INTERFERENCE (SINR)'),
                E('div', { 'id': 'jodu-aim-sinr-jumbo', 'class': 'jodu-aiming-jumbo', 'style': 'color:#94a3b8;' }, [
                    E('span', { 'id': 'jodu-aim-sinr-val' }, '--'),
                    E('span', { 'class': 'jodu-aiming-unit' }, 'dB')
                ]),
                E('div', { 'style': 'display:flex;justify-content:center;gap:8px;align-items:center;margin-bottom:6px;' }, [
                    E('span', { 'id': 'jodu-aim-sinr-badge', 'class': 'jodu-badge', 'style': 'background:#1e293b;color:#94a3b8;' }, 'Sampling...'),
                    E('span', { 'id': 'jodu-aim-rsrq-badge', 'class': 'jodu-badge', 'style': 'background:#1e293b;color:#94a3b8;' }, 'RSRQ: -- dB')
                ]),
                E('div', { 'class': 'jodu-aiming-meter-track' }, [
                    E('div', { 'id': 'jodu-aim-sinr-fill', 'class': 'jodu-aiming-meter-fill', 'style': 'width:0%;background:#818cf8;' }),
                    E('div', { 'id': 'jodu-aim-sinr-peak-marker', 'class': 'jodu-aiming-peak-pointer', 'style': 'left:0%;display:none;' })
                ]),
                E('div', { 'style': 'display:flex;justify-content:space-between;font-size:0.75em;color:#64748b;margin-top:4px;' }, [
                    E('span', {}, '-5 dB (Noisy)'),
                    E('span', { 'id': 'jodu-aim-sinr-peak', 'style': 'color:#facc15;font-weight:700;' }, 'PEAK: -- dB'),
                    E('span', {}, '+30 dB (Pristine)')
                ])
            ]);

            var grid = E('div', { 'class': 'jodu-aiming-grid' }, [
                rsrpCard,
                sinrCard
            ]);

            // Handover Alert Box
            var handoverAlert = E('div', {
                'id': 'jodu-aim-handover',
                'class': 'jodu-alert-banner',
                'style': 'display:none;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);color:#fbbf24;margin-bottom:14px;text-align:left;'
            }, '');

            // Cell Context Bar
            var contextBar = E('div', { 'class': 'jodu-aiming-context' }, [
                E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;' }, [
                    E('div', {}, [
                        E('div', { 'style': 'font-size:0.72em;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.08em;' }, 'ACTIVE SERVING CELL'),
                        E('div', { 'style': 'font-size:1.05em;font-weight:700;color:#f8fafc;margin-top:2px;' }, [
                            E('span', { 'id': 'jodu-aim-serving-net' }, 'JioTrue 5G'),
                            ' · Band ',
                            E('span', { 'id': 'jodu-aim-serving-band', 'style': 'color:#38bdf8;' }, '--'),
                            ' · PCI ',
                            E('span', { 'id': 'jodu-aim-serving-pci', 'style': 'color:#facc15;' }, '--'),
                            ' · ARFCN ',
                            E('span', { 'id': 'jodu-aim-serving-arfcn', 'style': 'color:#a78bfa;' }, '--'),
                            E('span', { 'id': 'jodu-aim-serving-dist', 'style': 'color:#34d399;margin-left:6px;font-size:0.9em;' }, '')
                        ])
                    ]),
                    E('div', { 'id': 'jodu-aim-ca-badge', 'style': 'font-size:0.82em;color:#94a3b8;' }, 'Carrier Aggregation: Standalone')
                ])
            ]);

            // Field Guide
            var guide = E('div', { 'class': 'jodu-aiming-guide' }, [
                E('div', { 'style': 'font-weight:700;color:#38bdf8;margin-bottom:4px;display:flex;align-items:center;gap:6px;' }, [
                    svgIcon('radar', 13, '#38bdf8'),
                    'Outdoor Antenna Aiming Field Guide:'
                ]),
                E('ul', { 'style': 'margin:0;padding-left:18px;' }, [
                    E('li', {}, 'Rotate the antenna horizontally in slow 5°–10° increments and pause for 2 seconds at each angle to let modem AGC settle.'),
                    E('li', {}, 'Use "Reset Peak" whenever relocating or adjusting elevation to establish a fresh baseline.'),
                    E('li', {}, 'If target tower is known, lock the cell under "Nearby Cells" on the dashboard to prevent unintended handovers while turning.')
                ])
            ]);

            var footer = E('div', { 'style': 'display:flex;justify-content:flex-end;gap:10px;margin-top:16px;' }, [
                E('button', {
                    'class': 'btn cbi-button-neutral',
                    'style': 'padding:6px 18px;border-radius:4px;font-weight:600;',
                    'click': closeAimingModal
                }, 'Exit Aiming Mode')
            ]);

            var modalRoot = E('div', { 'id': 'jodu-aiming-modal-root', 'class': 'jodu-aiming-modal' }, [
                modalTop,
                handoverAlert,
                grid,
                contextBar,
                guide,
                footer
            ]);

            ui.showModal('Outdoor Antenna Alignment & RF Telemetry', [modalRoot]);

            if (lastStatusData) {
                updateAimingModal(lastStatusData);
            }
        }

        function updateAimingModal(data) {
            if (!aimingSession.active) return;
            var curRsrp = parseFloat(data.rsrp);
            var curSinr = parseFloat(data.sinr);

            // Audio tone
            playAimingBeep(data.rsrp);

            // Track peaks
            if (!isNaN(curRsrp)) {
                if (aimingSession.startRsrp == null) aimingSession.startRsrp = curRsrp;
                if (aimingSession.peakRsrp == null || curRsrp > aimingSession.peakRsrp) {
                    aimingSession.peakRsrp = curRsrp;
                }
            }
            if (!isNaN(curSinr)) {
                if (aimingSession.peakSinr == null || curSinr > aimingSession.peakSinr) {
                    aimingSession.peakSinr = curSinr;
                }
            }

            // Update RSRP card
            var rsrpEl = document.getElementById('jodu-aim-rsrp-val');
            var rsrpJumbo = document.getElementById('jodu-aim-rsrp-jumbo');
            var rsrpBadge = document.getElementById('jodu-aim-rsrp-badge');
            var rsrpDelta = document.getElementById('jodu-aim-rsrp-delta');
            var rsrpFill = document.getElementById('jodu-aim-rsrp-fill');
            var rsrpPeakMarker = document.getElementById('jodu-aim-rsrp-peak-marker');
            var rsrpPeakText = document.getElementById('jodu-aim-rsrp-peak');

            if (rsrpEl) {
                if (!isNaN(curRsrp)) {
                    rsrpEl.textContent = curRsrp.toFixed(0);
                    var col = qualityColor('rsrp', curRsrp);
                    rsrpJumbo.style.color = col;
                    var qualPct = signalQualityPercent(curRsrp);
                    var qualText = qualPct >= 75 ? 'Excellent Coverage' : (qualPct >= 45 ? 'Good Signal' : 'Weak Signal');
                    rsrpBadge.textContent = qualText + ' (' + qualPct + '%)';
                    rsrpBadge.style.background = col + '20';
                    rsrpBadge.style.color = col;
                    rsrpBadge.style.borderColor = col + '40';

                    // Delta
                    if (aimingSession.startRsrp != null) {
                        var diff = Math.round(curRsrp - aimingSession.startRsrp);
                        if (diff > 0) {
                            rsrpDelta.textContent = '▲ +' + diff + ' dBm from start';
                            rsrpDelta.style.color = '#34d399';
                            rsrpDelta.style.background = 'rgba(16,185,129,0.15)';
                        } else if (diff < 0) {
                            rsrpDelta.textContent = '▼ ' + diff + ' dBm from start';
                            rsrpDelta.style.color = '#f87171';
                            rsrpDelta.style.background = 'rgba(239,68,68,0.15)';
                        } else {
                            rsrpDelta.textContent = '● 0 dBm (baseline)';
                            rsrpDelta.style.color = '#94a3b8';
                            rsrpDelta.style.background = '#1e293b';
                        }
                    }

                    // Meter
                    var fillPct = Math.max(0, Math.min(100, Math.round(((curRsrp - (-120)) / 60) * 100)));
                    rsrpFill.style.width = fillPct + '%';
                    rsrpFill.style.background = col;

                    if (aimingSession.peakRsrp != null) {
                        var peakPct = Math.max(0, Math.min(100, Math.round(((aimingSession.peakRsrp - (-120)) / 60) * 100)));
                        rsrpPeakMarker.style.display = 'block';
                        rsrpPeakMarker.style.left = peakPct + '%';
                        rsrpPeakText.textContent = 'PEAK: ' + aimingSession.peakRsrp.toFixed(0) + ' dBm';
                    }
                } else {
                    rsrpEl.textContent = '--';
                    rsrpJumbo.style.color = '#94a3b8';
                }
            }

            // Update SINR card
            var sinrEl = document.getElementById('jodu-aim-sinr-val');
            var sinrJumbo = document.getElementById('jodu-aim-sinr-jumbo');
            var sinrBadge = document.getElementById('jodu-aim-sinr-badge');
            var rsrqBadge = document.getElementById('jodu-aim-rsrq-badge');
            var sinrFill = document.getElementById('jodu-aim-sinr-fill');
            var sinrPeakMarker = document.getElementById('jodu-aim-sinr-peak-marker');
            var sinrPeakText = document.getElementById('jodu-aim-sinr-peak');

            if (sinrEl) {
                if (!isNaN(curSinr)) {
                    sinrEl.textContent = (curSinr > 0 ? '+' : '') + curSinr.toFixed(0);
                    var colS = qualityColor('sinr', curSinr);
                    sinrJumbo.style.color = colS;
                    var sinrText = curSinr >= 15 ? 'Pristine Radio (Low Noise)' : (curSinr >= 5 ? 'Moderate Quality' : 'High Noise / Interference');
                    sinrBadge.textContent = sinrText;
                    sinrBadge.style.background = colS + '20';
                    sinrBadge.style.color = colS;
                    sinrBadge.style.borderColor = colS + '40';

                    var fillPctS = Math.max(0, Math.min(100, Math.round(((curSinr - (-5)) / 35) * 100)));
                    sinrFill.style.width = fillPctS + '%';
                    sinrFill.style.background = colS;

                    if (aimingSession.peakSinr != null) {
                        var peakPctS = Math.max(0, Math.min(100, Math.round(((aimingSession.peakSinr - (-5)) / 35) * 100)));
                        sinrPeakMarker.style.display = 'block';
                        sinrPeakMarker.style.left = peakPctS + '%';
                        sinrPeakText.textContent = 'PEAK: ' + (aimingSession.peakSinr > 0 ? '+' : '') + aimingSession.peakSinr.toFixed(0) + ' dB';
                    }
                } else {
                    sinrEl.textContent = '--';
                    sinrJumbo.style.color = '#94a3b8';
                }
                if (rsrqBadge && data.rsrq) {
                    rsrqBadge.textContent = 'RSRQ: ' + data.rsrq + ' dB';
                }
            }

            // Serving Cell Context & Handover Detector
            var pci = data.physical_cell_id || data.pci || '--';
            var arfcn = data.nr_earcn || data.arfcn || '--';
            var band = data.band ? 'n' + data.band : '--';
            var plmn = data.plmn || 'JioTrue 5G';

            var pciEl = document.getElementById('jodu-aim-serving-pci');
            var arfcnEl = document.getElementById('jodu-aim-serving-arfcn');
            var bandEl = document.getElementById('jodu-aim-serving-band');
            var netEl = document.getElementById('jodu-aim-serving-net');
            var handoverEl = document.getElementById('jodu-aim-handover');
            var caBadge = document.getElementById('jodu-aim-ca-badge');

            if (pciEl) pciEl.textContent = pci;
            if (arfcnEl) arfcnEl.textContent = arfcn;
            if (bandEl) bandEl.textContent = band;
            if (netEl) netEl.textContent = plmn;

            var distEl = document.getElementById('jodu-aim-serving-dist');
            if (distEl) {
                var distStr = formatTowerDistance(data.timing_advance);
                distEl.textContent = (distStr && distStr !== '--') ? '· ' + distStr : '';
            }

            if (pci !== '--') {
                if (aimingSession.initialPci == null) {
                    aimingSession.initialPci = pci;
                } else if (aimingSession.initialPci !== pci && handoverEl) {
                    handoverEl.style.display = 'block';
                    handoverEl.innerHTML = '<strong>TOWER HANDOVER DETECTED:</strong> Serving Cell changed from PCI <strong>' +
                        aimingSession.initialPci + '</strong> to <strong>' + pci + '</strong>! You may have turned away from your target tower.';
                }
            }

            if (caBadge) {
                var hasCa = !isEmptyValue(data.SCC_BAND) || !isEmptyValue(data.scc_band);
                if (hasCa) {
                    var sccB = data.SCC_BAND || data.scc_band;
                    var sccR = data.SCC_RSRP || data.scc_rsrp || '--';
                    var pBw = parseBwMHz(data.bandwidth);
                    var sBw = parseBwMHz(data.SCC_BW || data.scc_bw);
                    var totBw = (pBw > 0 ? pBw : 0) + (sBw > 0 ? sBw : 0);
                    var bwText = totBw > 0 ? ' · Total: ' + totBw + ' MHz DL' : '';
                    caBadge.innerHTML = 'Carrier Aggregation: <span style="color:#c084fc;font-weight:700;">Active' + bwText + '</span> (SCC B' + sccB + ' · RSRP ' + sccR + ' dBm)';
                } else {
                    caBadge.textContent = 'Carrier Aggregation: Single Carrier';
                }
            }
        }

        // Initialize poll with configured interval (1 to 10 seconds, default 3)
        var initInterval = parseInt(uci.get('jodu5164x', 'main', 'poll_interval'), 10) || 3;
        if (initInterval < 1 || initInterval > 10) initInterval = 3;
        currentPollInterval = initInterval;
        poll.add(refreshNow, currentPollInterval);
        triggerRefresh = refreshNow;

        var toggleBtn = E('button', {
            'class': 'btn jodu-top-btn',
            'click': ui.createHandlerFn(this, function () {
                var willEnable = toggleBtn.getAttribute('data-state') !== 'on';
                return fs.exec_direct('/usr/libexec/jodu5164x-toggle.sh', [willEnable ? '1' : '0']).then(function () {
                    return refreshNow();
                }).catch(function (e) {
                    notify('Failed to toggle monitoring: ' + e.message, 'danger', 5000);
                });
            })
        }, 'Monitoring: ...');

        function updateToggleBtn(st) {
            var isOn = st.server_link !== 'DISABLED';
            toggleBtn.setAttribute('data-state', isOn ? 'on' : 'off');
            dom.content(toggleBtn, [
                isOn ? E('span', { 'class': 'jodu-pulse-dot' }) : svgIcon('play', 12, '#94a3b8'),
                E('span', { 'style': 'margin-left:5px;' }, isOn ? 'Monitoring: ON' : 'Monitoring: OFF')
            ]);
            toggleBtn.style.color = isOn ? COLOR_GOOD : COLOR_POOR;
            toggleBtn.style.borderColor = isOn ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
        }

        var aimingBtn = E('button', {
            'class': 'btn jodu-top-btn',
            'style': 'color:#38bdf8;border-color:#1e3a5f;',
            'click': ui.createHandlerFn(this, openAimingModal)
        }, [
            svgIcon('radar', 13, '#38bdf8'),
            E('span', { 'style': 'margin-left:5px;' }, 'Aiming Mode')
        ]);

        var customizeBtn = E('button', {
            'class': 'btn jodu-top-btn',
            'click': ui.createHandlerFn(this, showCustomizeModal)
        }, [
            svgIcon('customize', 13, '#94a3b8'),
            E('span', { 'style': 'margin-left:5px;' }, 'Widgets')
        ]);

        var refreshBtn = E('button', {
            'class': 'btn jodu-top-btn',
            'click': ui.createHandlerFn(this, function () {
                refreshBtn.innerHTML = '';
                refreshBtn.appendChild(svgIcon('refresh', 13, '#38bdf8'));
                refreshBtn.appendChild(E('span', { 'style': 'margin-left:5px;' }, 'Syncing...'));
                refreshNow().then(function () {
                    refreshBtn.innerHTML = '';
                    refreshBtn.appendChild(svgIcon('refresh', 13, '#94a3b8'));
                    refreshBtn.appendChild(E('span', { 'style': 'margin-left:5px;' }, 'Refresh'));
                });
            })
        }, [
            svgIcon('refresh', 13, '#94a3b8'),
            E('span', { 'style': 'margin-left:5px;' }, 'Refresh')
        ]);

        var settingsBtn = E('button', {
            'class': 'btn jodu-top-btn',
            'click': ui.createHandlerFn(this, openSettingsModal)
        }, [
            svgIcon('settings', 13, '#94a3b8'),
            E('span', { 'style': 'margin-left:5px;' }, 'Settings')
        ]);

        // Scoped Stylesheet for Modern Industrial Aesthetics
        var styleNode = E('style', {}, [
            '.jodu-wrapper { background:#080d1a; color:#e2e8f0; border-radius:8px; padding:18px 20px; border:1px solid #1e293b; box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }',
            '.jodu-top-bar { display:flex; justify-content:space-between; align-items:center; padding-bottom:14px; border-bottom:1px solid #1e293b; margin-bottom:18px; flex-wrap:wrap; gap:12px; }',
            '.jodu-title-block h2 { margin:0; font-size:1.25em; font-weight:800; letter-spacing:0.04em; color:#f8fafc; display:inline-block; }',
            '.jodu-live-badge { display:inline-flex; align-items:center; gap:5px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:0.68em; font-weight:700; letter-spacing:0.08em; background:#0f1f1a; color:#34d399; border:1px solid #065f46; padding:2px 7px; border-radius:4px; }',
            '.jodu-subtitle { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:0.7em; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; margin-top:3px; font-weight:600; }',
            '.jodu-actions { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }',
            '.jodu-top-btn { font-size:0.82em; padding:6px 12px; border-radius:4px; border:1px solid #1e293b; background:#0f172a; transition:all 0.15s ease; font-weight:600; color:#cbd5e1; cursor:pointer; display:inline-flex; align-items:center; }',
            '.jodu-top-btn:hover { background:#1e293b; border-color:#334155; color:#f8fafc; }',
            '.jodu-pulse-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; animation:jodu-pulse 2s infinite; vertical-align:middle; }',
            '@keyframes jodu-pulse { 0% { box-shadow:0 0 0 0 rgba(16,185,129,0.6); } 70% { box-shadow:0 0 0 5px rgba(16,185,129,0); } 100% { box-shadow:0 0 0 0 rgba(16,185,129,0); } }',
            '.jodu-sig-bar { transition:background 0.2s ease; }',
            '.jodu-sum-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }',
            '.jodu-sum-card { flex:1; min-width:150px; padding:14px 12px; text-align:center; background:#0d1522; border:1px solid #1e293b; border-radius:6px; transition:border-color 0.15s ease; }',
            '.jodu-sum-card:hover { border-color:#334155; }',
            '.jodu-sum-icon { margin-bottom:4px; line-height:1; display:flex; justify-content:center; }',
            '.jodu-sum-val { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:1.45em; font-weight:700; margin:4px 0 2px; letter-spacing:-0.01em; font-variant-numeric:tabular-nums; }',
            '.jodu-sum-sub { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:0.72em; color:#64748b; font-weight:500; margin-bottom:4px; }',
            '.jodu-sum-lbl { font-size:0.68em; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700; }',
            '.jodu-grid-2col { display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:14px; margin-bottom:14px; }',
            '.jodu-grid-auto { display:grid; grid-template-columns:repeat(auto-fit, minmax(380px, 1fr)); gap:14px; margin-bottom:14px; }',
            '@media (max-width:768px) { .jodu-grid-auto { grid-template-columns:1fr; } }',
            '.jodu-grid-3col { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px; margin-bottom:14px; }',
            '@media (max-width:640px) { ' +
                '.jodu-wrapper { padding:12px 10px; border-radius:6px; } ' +
                '.jodu-top-bar { flex-direction:column; align-items:stretch; gap:10px; } ' +
                '.jodu-title-block { text-align:center; } ' +
                '.jodu-actions { display:grid; grid-template-columns:repeat(2, 1fr); width:100%; gap:5px; } ' +
                '.jodu-top-btn { width:100%; text-align:center; justify-content:center; } ' +
                '.jodu-sum-row { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; } ' +
                '.jodu-sum-card { min-width:unset; padding:12px 8px; } ' +
                '.jodu-sum-val { font-size:1.25em; } ' +
                '.jodu-grid-2col, .jodu-grid-auto, .jodu-grid-3col { grid-template-columns:1fr; } ' +
            '}',
            '.jodu-thermal-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:14px; }',
            '@media (max-width:768px) { .jodu-thermal-grid { grid-template-columns:1fr; gap:10px; } }',
            '.jodu-thermal-col { background:#0a0e17; border:1px solid #1e293b; border-radius:6px; padding:10px 12px; }',
            '.jodu-card { background:#0d1522; border:1px solid #1e293b; border-radius:6px; overflow:hidden; }',
            '.jodu-card:hover { border-color:#334155; }',
            '.jodu-card-hdr { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#111a28; border-bottom:1px solid #1e293b; }',
            '.jodu-card-icon { line-height:1; display:inline-flex; align-items:center; }',
            '.jodu-card-title { font-size:0.82em; font-weight:700; color:#cbd5e1; letter-spacing:0.05em; text-transform:uppercase; }',
            '.jodu-card-body { padding:14px; }',
            '.jodu-panel-hide-btn { background:transparent; border:none; color:#64748b; font-size:0.85em; padding:2px 5px; border-radius:4px; cursor:pointer; line-height:1; }',
            '.jodu-panel-hide-btn:hover { background:rgba(239,68,68,0.15); color:#f87171; }',
            '.jodu-summary-wrapper { position:relative; margin-bottom:18px; }',
            '.jodu-summary-hide-btn { position:absolute; top:-10px; right:0; z-index:2; background:#0f172a; border:1px solid #1e293b; color:#64748b; font-size:0.75em; padding:2px 6px; border-radius:4px; cursor:pointer; }',
            '.jodu-summary-hide-btn:hover { background:rgba(239,68,68,0.15); color:#f87171; border-color:#ef4444; }',
            '.jodu-empty-widgets-box { text-align:center; padding:50px 20px; background:#0d1522; border:1px dashed #1e293b; border-radius:8px; margin:16px 0; }',
            '.jodu-widget-item { display:block; background:#0a0e17; border:1px solid #1e293b; border-radius:6px; padding:10px 12px; cursor:pointer; transition:border-color 0.15s ease; }',
            '.jodu-widget-item:hover { border-color:#38bdf8; background:#111a28; }',
            '.jodu-table { width:100%; border-collapse:collapse; font-size:0.84em; }',
            '.jodu-tr { border-bottom:1px solid #151e2e; transition:background 0.1s ease; }',
            '.jodu-tr:hover { background:#111a28; }',
            '.jodu-tr:last-child { border-bottom:none; }',
            '.jodu-th-tr { border-bottom:1px solid #1e293b; }',
            '.jodu-th { text-align:left; padding:6px 8px; font-size:0.7em; color:#64748b; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; }',
            '.jodu-td-lbl { padding:7px 8px; color:#94a3b8; }',
            '.jodu-td-val { padding:7px 8px; text-align:right; color:#f8fafc; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-variant-numeric:tabular-nums; }',
            '.jodu-td-val.jodu-has-color { font-weight:600; }',
            '.jodu-dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:6px; vertical-align:middle; }',
            '.jodu-badge { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:0.72em; padding:2px 7px; border-radius:4px; font-weight:600; display:inline-block; letter-spacing:0.03em; }',
            '.jodu-btn-sm { font-size:0.75em; padding:4px 9px; border-radius:4px; font-weight:600; background:#1e293b; border:1px solid #334155; color:#f8fafc; cursor:pointer; display:inline-flex; align-items:center; gap:4px; }',
            '.jodu-btn-sm:hover { background:#334155; }',
            '.jodu-gauge-center { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; }',
            '.jodu-gauge-val { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:1.55em; font-weight:800; line-height:1; letter-spacing:-0.02em; font-variant-numeric:tabular-nums; }',
            '.jodu-gauge-sub { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:0.72em; color:#64748b; margin-top:3px; font-weight:600; }',
            '.jodu-stat-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #151e2e; font-size:0.84em; }',
            '.jodu-stat-lbl { color:#94a3b8; }',
            '.jodu-stat-val { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-variant-numeric:tabular-nums; font-weight:600; color:#f8fafc; }',
            '.jodu-subheading { text-align:center; color:#64748b; font-size:0.7em; letter-spacing:0.08em; text-transform:uppercase; margin:12px 0 6px; font-weight:700; }',
            '.jodu-bar-track { background:#1e293b; border-radius:3px; height:6px; overflow:hidden; }',
            '.jodu-bar-fill { height:100%; border-radius:3px; transition:width 0.3s ease; }',
            '.jodu-alert-box { margin-top:10px; padding:8px 12px; border-radius:4px; font-size:0.8em; line-height:1.4; font-weight:500; }',
            '.jodu-alert-banner { margin-bottom:14px; padding:10px 14px; border-radius:6px; background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); color:#60a5fa; font-weight:600; text-align:center; font-size:0.85em; }',
            '.jodu-paused-box { text-align:center; padding:50px 20px; background:#0d1522; border:1px solid #1e293b; border-radius:6px; }',
            '.jodu-idle-panel { padding:24px 0; text-align:center; color:#888; }',
            '.jodu-loading-box { text-align:center; padding:60px 20px; }',
            '.jodu-spinner { width:32px; height:32px; margin:0 auto; border:2px solid #1e293b; border-top-color:#38bdf8; border-radius:50%; animation:jodu-spin 0.8s linear infinite; }',
            '@keyframes jodu-spin { to { transform:rotate(360deg); } }',
            '.jodu-modal-sec { background:#0a0e17; border:1px solid #1e293b; border-radius:6px; padding:12px 14px; margin-bottom:12px; }',
            '.jodu-modal-sec-title { font-size:0.75em; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px; display:flex; align-items:center; gap:6px; }',
            '.jodu-modal-field { margin-bottom:10px; }',
            '.jodu-modal-field:last-child { margin-bottom:0; }',
            '.jodu-modal-label { display:block; margin-bottom:4px; color:#94a3b8; font-size:0.8em; font-weight:600; }',
            '.jodu-aiming-modal { font-family:inherit; color:#f8fafc; width:100%; box-sizing:border-box; }',
            '.jodu-aiming-top { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-bottom:12px; border-bottom:1px solid #1e293b; margin-bottom:14px; }',
            '.jodu-aiming-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:14px; margin-bottom:14px; }',
            '@media (max-width:680px) { .jodu-aiming-grid { grid-template-columns:1fr; gap:10px; } }',
            '.jodu-aiming-card { background:#0d1522; border:1px solid #1e293b; border-radius:6px; padding:14px; text-align:center; position:relative; }',
            '.jodu-aiming-title { font-size:0.7em; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; font-weight:700; margin-bottom:4px; }',
            '.jodu-aiming-jumbo { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:3em; font-weight:800; line-height:1.1; letter-spacing:-0.03em; margin:4px 0; font-variant-numeric:tabular-nums; }',
            '.jodu-aiming-unit { font-size:0.4em; font-weight:600; color:#94a3b8; margin-left:4px; }',
            '.jodu-aiming-meter-track { position:relative; height:10px; background:#1e293b; border-radius:2px; margin:12px 0 8px; overflow:visible; }',
            '.jodu-aiming-meter-fill { height:100%; border-radius:2px; transition:width 0.3s ease; }',
            '.jodu-aiming-peak-pointer { position:absolute; top:-3px; width:3px; height:16px; background:#facc15; border-radius:1px; transform:translateX(-50%); }',
            '.jodu-aiming-context { background:#0a0e17; border:1px solid #1e293b; border-radius:6px; padding:10px 14px; margin-bottom:12px; }',
            '.jodu-aiming-guide { background:#0d1522; border:1px solid #1e293b; border-radius:6px; padding:10px 14px; font-size:0.8em; color:#94a3b8; line-height:1.4; margin-bottom:14px; }',
            '.jodu-aim-btn { padding:5px 12px; border-radius:4px; border:1px solid #334155; background:#1e293b; color:#cbd5e1; font-weight:600; font-size:0.8em; cursor:pointer; display:inline-flex; align-items:center; gap:5px; }',
            '.jodu-aim-btn:hover { background:#334155; color:#f8fafc; }',
            '.jodu-modal-hint { font-size:0.72em; color:#64748b; margin-top:3px; }'
        ]);

        var topBar = E('div', { 'class': 'jodu-top-bar' }, [
            E('div', { 'class': 'jodu-title-block' }, [
                E('div', { 'style': 'display:flex;align-items:center;gap:10px;' }, [
                    E('h2', {}, 'SERCOMM JODU5164X'),
                    E('span', { 'class': 'jodu-live-badge' }, [
                        E('span', { 'class': 'jodu-pulse-dot' }),
                        '5G-NR TELEMETRY'
                    ])
                ]),
                E('div', { 'class': 'jodu-subtitle' }, 'OUTDOOR CELLULAR UNIT • REAL-TIME RF MONITOR')
            ]),
            E('div', { 'class': 'jodu-actions' }, [
                toggleBtn,
                aimingBtn,
                customizeBtn,
                refreshBtn,
                settingsBtn
            ])
        ]);

        refreshNow();

        return E('div', { 'class': 'cbi-map' }, [
            styleNode,
            E('div', { 'class': 'jodu-wrapper' }, [
                topBar,
                container
            ])
        ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});