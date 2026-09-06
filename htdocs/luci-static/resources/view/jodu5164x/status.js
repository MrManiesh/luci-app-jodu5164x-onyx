'use strict';
'require view';
'require fs';
'require poll';
'require ui';
'require dom';
'require uci';

/* =============================================================================
   luci-app-jodu5164x-status - Advanced 5G ODU Dashboard
   Author: Manish Matwa Choudhary
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

var rebootState = { inProgress: false, sawOffline: false };
var triggerRefresh = null;
var currentPollInterval = 3;

function notify(text, cls, duration) {
    var n = ui.addNotification(null, E('p', {}, text), cls || 'info');
    if (duration) {
        setTimeout(function () {
            if (n && n.parentNode) n.parentNode.removeChild(n);
        }, duration);
    }
    return n;
}

function fetchStatus() {
    return fs.exec_direct(SCRIPT_PATH, []).then(function (res) {
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

function summaryCard(label, value, color, sublabel, icon) {
    var children = [];
    if (icon) {
        children.push(E('div', { 'class': 'jodu-sum-icon' }, icon));
    }
    children.push(E('div', { 'class': 'jodu-sum-val', 'style': 'color:' + (color || '#f8fafc') }, value));
    if (sublabel) {
        children.push(E('div', { 'class': 'jodu-sum-sub' }, sublabel));
    }
    children.push(E('div', { 'class': 'jodu-sum-lbl' }, label));
    return E('div', { 'class': 'jodu-sum-card' }, children);
}

function summaryRow(data, online) {
    if (!online) {
        return E('div', { 'class': 'jodu-sum-row' }, [
            summaryCard('NETWORK', 'OFFLINE', COLOR_POOR, 'ODU Unreachable', '📡'),
            summaryCard('SIGNAL STRENGTH', '--', COLOR_NEUTRAL, 'No connection', '📶'),
            summaryCard('RADIO PURITY', '--', COLOR_NEUTRAL, 'Telemetry paused', '⚡'),
            summaryCard('ETHERNET LINK', formatSpeed(data.eth_speed), COLOR_NEUTRAL, data.eth_link_status || 'Disconnected', '🔌')
        ]);
    }
    var qualityPct = signalQualityPercent(data.rsrp);
    var qualityColorVal = qualityPct == null ? COLOR_NEUTRAL : (qualityPct >= 70 ? COLOR_GOOD : (qualityPct >= 40 ? COLOR_OK : COLOR_POOR));
    var noSim = data.sim_status === 'missing';
    var speedCol = ethSpeedColor(data.eth_speed);
    var netSub = (data.plmn || '405-874') + (data.operating_mode ? ' · NR5G-' + data.operating_mode : '') + (data.band ? ' · B' + data.band : '');
    var sigSub = qualityPct != null ? (qualityPct + '% · ' + (qualityPct >= 75 ? 'Excellent Coverage' : (qualityPct >= 45 ? 'Good Signal' : 'Weak Signal'))) : 'Sampling...';
    var sinrVal = (data.sinr && data.sinr !== 'NA' && data.sinr !== '--') ? data.sinr + ' dB SINR' : 'NA';
    var puritySub = (data.rsrq && data.rsrq !== 'NA' && data.rsrq !== '--') ? 'RSRQ: ' + data.rsrq + ' dB' : 'Carrier Sync Active';
    var ethSub = (data.eth_link_status ? 'Link: ' + data.eth_link_status : 'Port Active') + (data.eth_duplex ? ' · ' + data.eth_duplex : '');

    return E('div', { 'class': 'jodu-sum-row' }, [
        noSim ? summaryCard('NETWORK', 'No SIM', COLOR_POOR, 'Please insert pSIM or eSIM', '📱') :
                summaryCard('NETWORK', 'JioTrue 5G', '#38bdf8', netSub, '📡'),
        summaryCard('SIGNAL STRENGTH', (data.rsrp && data.rsrp !== 'NA' && data.rsrp !== '--') ? data.rsrp + ' dBm' : 'NA', qualityColor('rsrp', data.rsrp), sigSub, '📶'),
        summaryCard('RADIO PURITY', sinrVal, qualityColor('sinr', data.sinr), puritySub, '⚡'),
        summaryCard('ETHERNET LINK', formatSpeed(data.eth_speed), speedCol, ethSub, '🔌')
    ]);
}

function colorDot(color) {
    return E('span', {
        'class': 'jodu-dot',
        'style': 'background:' + color + ';box-shadow:0 0 8px ' + color + '80;'
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

function secondaryCellPanel(merged) {
    var band = merged['scc_band'];
    var pci = merged['scc_pci'];
    var rsrp = merged['scc_rsrp'];
    var caActive = !isEmptyValue(band) || !isEmptyValue(pci) || !isEmptyValue(rsrp);
    if (!caActive) {
        return panel('Cellular Parameters (Secondary Cell)', E('div', { 'class': 'jodu-idle-panel' }, [
            E('div', { 'style': 'font-size:2.2em;margin-bottom:8px;opacity:0.6;' }, '📶'),
            E('h4', { 'style': 'margin:0 0 4px;color:#94a3b8;font-weight:600;' }, 'Carrier Aggregation Inactive'),
            E('p', { 'style': 'margin:0;color:#64748b;font-size:0.85em;' }, 'Secondary carrier activates dynamically during high throughput demand.')
        ]), '⚡');
    }
    return panel('Cellular Parameters (Secondary Cell)', cellTable('scc_', merged), '⚡');
}

function cellTable(prefix, d) {
    var band = d[prefix + 'band'];
    var bw = d[prefix + 'bandwidth'] || d[prefix + 'bw'];
    var arfcn = d[prefix + 'arfcn'];
    var pci = d[prefix + 'pci'];
    var bler = d[prefix + 'bler'];
    var modulation = d[prefix + 'modulation'];
    var mimo = d[prefix + 'mimo'];
    var rsrp = d[prefix + 'rsrp'];
    var rsrq = d[prefix + 'rsrq'];
    var sinr = d[prefix + 'sinr'];
    var rows = [
        paramRow('Band', band),
        paramRow('Bandwidth', bw),
        paramRow('NR-ARFCN', arfcn),
        paramRow('Physical Cell ID', pci),
        paramRow('BLER (downlink)', (bler != null && bler !== 'NA' && bler !== '--') ? bler + ' %' : bler, qualityColor('bler', bler)),
        paramRow('Modulation', modulation),
        paramRow('MIMO', mimo),
        paramRow('SS-RSRP', (rsrp != null && rsrp !== 'NA' && rsrp !== '--') ? rsrp + ' dBm' : rsrp, qualityColor('rsrp', rsrp)),
        paramRow('SS-RSRQ', (rsrq != null && rsrq !== 'NA' && rsrq !== '--') ? rsrq + ' dB' : rsrq, qualityColor('rsrq', rsrq)),
        paramRow('SS-SINR', (sinr != null && sinr !== 'NA' && sinr !== '--') ? sinr + ' dB' : sinr, qualityColor('sinr', sinr))
    ];
    return E('table', { 'class': 'jodu-table' }, rows);
}

function panel(title, contentNode, icon) {
    return E('div', { 'class': 'jodu-card' }, [
        E('div', { 'class': 'jodu-card-hdr' }, [
            icon ? E('span', { 'class': 'jodu-card-icon' }, icon) : '',
            E('span', { 'class': 'jodu-card-title' }, title)
        ]),
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

function nearbyCellsSection(data) {
    var cells = Array.isArray(data.nearby_cells) ? data.nearby_cells.slice() : (Array.isArray(data.neighbors) ? data.neighbors.slice() : []);

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

    cells.sort(function (a, b) {
        if (a.isServing) return -1;
        if (b.isServing) return 1;
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
        actionBtns.push(E('button', { 'class': 'btn cbi-button-positive', 'style': 'font-size:0.8em;padding:4px 10px;border-radius:6px;margin-right:6px;', 'click': unlockCell }, '🔓 Unlock'));
    }
    actionBtns.push(E('button', { 'class': 'btn jodu-btn-sm', 'click': function () { manualLockModal(servingPci, servingArfcn); } }, '🔒 Manual Lock'));

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
        ]), '🛰️');
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
            }, 'Serving'));
        }
        return E('tr', { 'class': 'jodu-tr' }, [
            E('td', { 'class': 'jodu-td-lbl' }, pciDisplay),
            E('td', { 'class': 'jodu-td-lbl' }, c.arfcn),
            E('td', { 'class': 'jodu-td-val', 'style': 'color:' + color + ';font-weight:600;' }, c.rsrp + (c.rsrp !== '--' && c.rsrp !== 'NA' ? ' dBm' : '')),
            E('td', { 'class': 'jodu-td-val', 'style': 'color:#94a3b8;' }, c.rsrq + (c.rsrq !== '--' && c.rsrq !== 'NA' ? ' dB' : '')),
            E('td', { 'class': 'jodu-td-val', 'style': 'text-align:right' }, [
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

    return panel('Nearby Cells & Tower Scan', E('div', {}, [statusRow, table]), '🛰️');
}

function rebootOdu() {
    ui.showModal('Reboot 5G ODU?', [
        E('p', {}, 'This will reboot the Sercomm ODU modem. Internet connectivity will drop for a minute or two while it re-initializes and syncs with the cell tower.'),
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
    return '⚠️ Link negotiated at ' + v + ' Mbps. Use a Cat6+ Ethernet cable or Gigabit port to achieve 1 Gbps+ speeds.';
}

function ethSection(data) {
    var speedColor = ethSpeedColor(data.eth_speed);
    var rows = [
        paramRow('Link Status', data.eth_link_status, data.eth_link_status === 'Up' ? COLOR_GOOD : COLOR_POOR),
        paramRow('Speed', formatSpeed(data.eth_speed), speedColor),
        paramRow('Duplex', data.eth_duplex)
    ];
    var table = E('table', { 'class': 'jodu-table' }, rows);
    var children = [table];
    var speedSuggestion = ethSpeedSuggestion(data.eth_speed);
    if (speedSuggestion) {
        children.push(E('div', { 'class': 'jodu-alert-box', 'style': 'background:rgba(239,68,68,0.12);color:#f87171;' }, speedSuggestion));
    }
    var uptimeSec = parseInt(data.odu_uptime_sec, 10);
    if (!isNaN(uptimeSec) && uptimeSec > 86400 * 7) {
        children.push(E('div', { 'class': 'jodu-alert-box', 'style': 'background:rgba(245,158,11,0.12);color:#fbbf24;' }, '⚠️ High ODU uptime (' + formatUptime(data.odu_uptime_sec) + '). A periodic reboot improves 5G stability.'));
    }
    children.push(E('div', { 'style': 'margin-top:14px' }, [
        E('button', { 'class': 'btn cbi-button-negative', 'style': 'width:100%;padding:8px;border-radius:8px;font-weight:600;', 'click': rebootOdu }, '🔄 Reboot 5G ODU')
    ]));
    return panel('ODU Management & Hardware Control', E('div', {}, children), '🔌');
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

function dataUsageSection(data) {
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
    var note = E('div', { 'style': 'margin-top:10px;font-size:0.75em;color:#64748b;font-style:italic;' }, 'ℹ️ Session counters retrieved from ODU firmware.');
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
    return panel('Data Usage & Bandwidth Tracker', E('div', {}, [table, note, subheading('Usage Over Time'), historyTable]), '📈');
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
    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;margin:0 auto;filter:drop-shadow(0 0 6px ' + color + '40);">' +
        '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="' + stroke + '"/>' +
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
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.28"/>' +
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

function cpuGaugePanel(data) {
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
    return panel(title, content, '⚙️');
}

function memGaugePanel(data) {
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
            ramNote = E('div', { 'class': 'jodu-alert-box', 'style': 'background:rgba(59,130,246,0.12);color:#60a5fa;' }, 'ℹ️ This ODU supports 2.5 Gigabit Ethernet.');
        } else if (totalMb < 200) {
            ramNote = E('div', { 'class': 'jodu-alert-box', 'style': 'background:rgba(255,255,255,0.05);color:#94a3b8;' }, 'ℹ️ This ODU supports 1 Gigabit Ethernet.');
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
    return panel('Memory (RAM)', content, '🧠');
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

function cpuDetailPanel(data) {
    var content = E('div', {}, [
        cpuLoadBar('Idle (Available)', data.odu_cpu_idle),
        cpuLoadBar('User Space', data.odu_cpu_user),
        cpuLoadBar('System Kernel', data.odu_cpu_system),
        cpuLoadBar('I/O Wait', data.odu_cpu_iowait),
        cpuLoadBar('Hardware IRQ', data.odu_cpu_irq),
        cpuLoadBar('Software IRQ', data.odu_cpu_softirq),
        E('div', { 'style': 'margin-top:12px;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;' }, [
            statLine('System Tasks', (data.odu_tasks_running !== '--' ? data.odu_tasks_running : 'NA') + ' / ' + (data.odu_tasks_total !== '--' ? data.odu_tasks_total : 'NA')),
            statLine('Context Switches / s', data.odu_ctxt_rate !== '--' ? data.odu_ctxt_rate + ' /s' : 'NA'),
            statLine('Hardware Interrupts / s', data.odu_intr_rate !== '--' ? data.odu_intr_rate + ' /s' : 'NA'),
            statLine('Active Connections', (data.odu_conntrack_count !== '--' && data.odu_conntrack_max !== '--') ? (data.odu_conntrack_count + ' / ' + data.odu_conntrack_max) : 'NA')
        ])
    ]);
    return panel('CPU Detailed Breakdown', content, '📊');
}

function thermalSection(data) {
    var zones = Array.isArray(data.thermal_zones) ? data.thermal_zones : [];
    if (!zones.length) {
        return panel('Internal Thermal Sensors', E('p', { 'style': 'color:#64748b;font-size:0.9em;padding:8px 0;' }, 'No temperature telemetry available (verify Settings).'), '🌡️');
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
        return E('table', { 'class': 'jodu-table' }, rows);
    }
    var table = E('div', { 'id': 'jodu5164x-thermal-scroll', 'style': 'display:flex;gap:20px;flex-wrap:wrap;' }, [
        E('div', { 'style': 'flex:1;min-width:220px' }, buildColumn(colA)),
        E('div', { 'style': 'flex:1;min-width:220px' }, buildColumn(colB))
    ]);
    var maxLabel = friendlySensorName(maxZone.type, maxZone.zone);
    var maxColor = tempColor(maxZone.temp_c);
    var header = E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:8px;' }, [
        E('span', { 'style': 'color:#94a3b8;font-size:0.85em;' }, zones.length + ' active sensors detected'),
        E('span', { 'class': 'jodu-badge', 'style': 'background:' + maxColor + '20;color:' + maxColor + ';border:1px solid ' + maxColor + '50;font-weight:700;' }, '🔥 Hottest: ' + maxZone.temp_c + ' °C (' + maxLabel + ')')
    ]);
    return panel('Internal Thermal Sensors', E('div', {}, [header, table]), '🌡️');
}

function renderDashboard(data) {
    var online = data.server_link === 'ONLINE';
    var disabled = data.server_link === 'DISABLED';

    if (disabled) {
        return E('div', { 'class': 'jodu-paused-box' }, [
            E('div', { 'style': 'font-size:2.6em;margin-bottom:12px;' }, '⏸️'),
            E('h3', { 'style': 'margin:0 0 8px;font-size:1.3em;color:#f8fafc;' }, 'ODU Monitoring Paused'),
            E('p', { 'style': 'color:#94a3b8;max-width:480px;margin:0 auto;line-height:1.5;font-size:0.92em;' },
                'The session has been freed so you can log into the native Sercomm ODU WebUI without single-login conflicts. Click "Monitoring: OFF" above when ready to resume live polling.')
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
        E('span', { 'style': 'margin-right:8px;' }, '🔄'),
        'ODU is rebooting — please wait, connection will restore automatically...'
    ]) : '';

    if (!online) {
        var diagMessages = [];
        if (data.webui_message) diagMessages.push(data.webui_message);
        if (data.telnet_message) diagMessages.push(data.telnet_message);
        if (!diagMessages.length) diagMessages.push('Could not reach JODU51641/JODU51642 (' + (data.error || 'unknown error') + ').');
        return E('div', {}, [
            rebootBanner,
            summaryRow(data, false),
            E('div', { 'style': 'display:flex;flex-direction:column;gap:10px;margin-top:16px;' }, diagMessages.map(function (msg) {
                return E('div', { 'class': 'alert-message warning' }, msg);
            }))
        ]);
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
        E('div', { 'style': 'font-size:2.2em;margin-bottom:8px;' }, '📱'),
        E('h4', { 'style': 'margin:0;color:#f87171;font-weight:700;' }, 'No SIM Card Detected'),
        E('p', { 'style': 'margin:4px 0 0;color:#94a3b8;font-size:0.88em;' }, 'Please insert a pSIM or activate eSIM profile on your ODU.')
    ]) : cellTable('', merged);

    var cellPanels = E('div', { 'class': 'jodu-grid-2col' }, [
        panel('Cellular Parameters (Primary Cell)', primaryCellContent, '📡'),
        secondaryCellPanel(merged)
    ]);

    var managementColumn = E('div', { 'class': 'jodu-grid-2col' }, [
        ethSection(data),
        nearbyCellsSection(data)
    ]);

    var telemetryGrid = E('div', { 'class': 'jodu-grid-3col' }, [
        cpuGaugePanel(data),
        memGaugePanel(data),
        cpuDetailPanel(data)
    ]);

    var bottomPanels = E('div', { 'class': 'jodu-grid-2col' }, [
        dataUsageSection(data),
        thermalSection(data)
    ]);

    var telnetNotice = (data.telnet_status && data.telnet_status !== 'ok') ? E('div', { 'class': 'alert-message warning', 'style': 'margin-bottom:16px;' },
        '⚠️ Telnet Notice: ' + (data.telnet_message || 'Telnet telemetry paused — check credentials in Settings.')) : '';

    return E('div', { 'class': 'jodu-container' }, [
        rebootBanner,
        telnetNotice,
        summaryRow(data, true),
        cellPanels,
        managementColumn,
        telemetryGrid,
        bottomPanels
    ]);
}

function loadingPlaceholder() {
    return E('div', { 'class': 'jodu-loading-box' }, [
        E('div', { 'class': 'jodu-spinner' }),
        E('h4', { 'style': 'margin:14px 0 4px;color:#f8fafc;font-weight:600;' }, 'Connecting to Sercomm 5G ODU...'),
        E('p', { 'style': 'margin:0;color:#64748b;font-size:0.85em;' }, 'Retrieving real-time radio metrics and hardware telemetry')
    ]);
}

return view.extend({
    load: function () {
        return uci.load('jodu5164x');
    },

    render: function () {
        var container = E('div', { 'id': 'jodu5164x-status-container' }, loadingPlaceholder());

        function refreshNow() {
            return fetchStatus().then(function (newData) {
                var scrollEl = document.getElementById('jodu5164x-thermal-scroll');
                var savedScrollTop = scrollEl ? scrollEl.scrollTop : null;
                var refreshed = renderDashboard(newData);
                dom.content(container, refreshed);
                if (savedScrollTop !== null) {
                    var newScrollEl = document.getElementById('jodu5164x-thermal-scroll');
                    if (newScrollEl) newScrollEl.scrollTop = savedScrollTop;
                }
                if (typeof updateToggleBtn === 'function') updateToggleBtn(newData);
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

        function openSettingsModal() {
            uci.unload('jodu5164x');
            uci.load('jodu5164x').then(function () {
                var host = uci.get('jodu5164x', 'main', 'host') || '';
                var username = uci.get('jodu5164x', 'main', 'username') || '';
                var password = uci.get('jodu5164x', 'main', 'password') || '';
                var telnetPort = uci.get('jodu5164x', 'main', 'telnet_port') || '23';
                var telnetPass = uci.get('jodu5164x', 'main', 'telnet_password') || '';
                var rebootEnabled = uci.get('jodu5164x', 'main', 'reboot_schedule_enabled') === '1';
                var rebootTime = uci.get('jodu5164x', 'main', 'reboot_schedule_time') || '03:00';
                var pollInterval = uci.get('jodu5164x', 'main', 'poll_interval') || '3';

                var inputStyle = 'width:100%;box-sizing:border-box';
                var hostInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': host, 'style': inputStyle, 'placeholder': '192.168.225.1' });
                var userInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': username, 'style': inputStyle, 'placeholder': 'Admin' });
                var passInput = E('input', { 'type': 'password', 'class': 'cbi-input-password', 'value': password, 'style': inputStyle });
                var portInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': telnetPort, 'style': inputStyle, 'placeholder': '23' });
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

                var secWeb = modalSection('WebUI Credentials', '🌐', [
                    field('ODU IP Address', hostInput),
                    field('WebUI Username', userInput),
                    field('WebUI Password', passInput)
                ]);

                var secTelnet = modalSection('Telnet Telemetry Service', '⚡', [
                    field('Telnet Port', portInput),
                    field('Telnet Password', telnetPassInput, 'Leave blank if no telnet password is configured on ODU')
                ]);

                var secPoll = modalSection('Telemetry Polling Rate', '⏱️', [
                    field('Stats Update Interval (1 - 10s)', intervalInput, 'Select how often LuCI and the background daemon query ODU radio and CPU stats')
                ]);

                var secReboot = modalSection('Automated Maintenance', '🔄', [
                    scheduleRow,
                    field('Scheduled Reboot Time', rebootTimeInput)
                ]);

                ui.showModal('⚙️ ODU Configuration & Settings', [
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
                                    intervalInput.value || '3'
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
                isOn ? E('span', { 'class': 'jodu-pulse-dot' }) : '⏸️ ',
                isOn ? 'Monitoring: ON' : 'Monitoring: OFF'
            ]);
            toggleBtn.style.color = isOn ? COLOR_GOOD : COLOR_POOR;
            toggleBtn.style.borderColor = isOn ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
        }

        var refreshBtn = E('button', {
            'class': 'btn jodu-top-btn',
            'click': ui.createHandlerFn(this, function () {
                refreshBtn.textContent = '🔄 ...';
                return refreshNow().then(function () {
                    refreshBtn.textContent = '🔄 Refresh';
                });
            })
        }, '🔄 Refresh');

        var settingsBtn = E('button', {
            'class': 'btn jodu-top-btn',
            'click': ui.createHandlerFn(this, openSettingsModal)
        }, '⚙️ Settings');

        // Scoped Stylesheet for Modern Aesthetics
        var styleNode = E('style', {}, [
            '.jodu-wrapper { background:radial-gradient(circle at 15% 15%, rgba(14, 165, 233, 0.08) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.08) 0%, transparent 45%), #0a0f1d; color:#e2e8f0; border-radius:18px; padding:22px 24px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 12px 40px rgba(0,0,0,0.35); box-sizing:border-box; }',
            '.jodu-top-bar { display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px;flex-wrap:wrap;gap:14px; }',
            '.jodu-title-block h2 { margin:0;font-size:1.55em;font-weight:800;letter-spacing:0.02em;background:linear-gradient(135deg,#38bdf8,#818cf8);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block; }',
            '.jodu-subtitle { font-size:0.75em;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin-top:2px;font-weight:600; }',
            '.jodu-actions { display:flex;gap:8px;align-items:center;flex-wrap:wrap; }',
            '.jodu-top-btn { font-size:0.85em;padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);transition:all 0.2s ease;font-weight:600;color:#f1f5f9;cursor:pointer; }',
            '.jodu-top-btn:hover { background:rgba(255,255,255,0.12);transform:translateY(-1px); }',
            '.jodu-pulse-dot { display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 rgba(16,185,129,0.6);animation:jodu-pulse 2s infinite;margin-right:6px;vertical-align:middle; }',
            '@keyframes jodu-pulse { 0% { box-shadow:0 0 0 0 rgba(16,185,129,0.7); } 70% { box-shadow:0 0 0 8px rgba(16,185,129,0); } 100% { box-shadow:0 0 0 0 rgba(16,185,129,0); } }',
            '.jodu-sum-row { display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px; }',
            '.jodu-sum-card { flex:1;min-width:160px;padding:18px 16px;text-align:center;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.12);transition:transform 0.25s ease, border-color 0.25s ease; }',
            '.jodu-sum-card:hover { transform:translateY(-2px);border-color:rgba(255,255,255,0.16); }',
            '.jodu-sum-icon { font-size:1.5em;margin-bottom:4px; }',
            '.jodu-sum-val { font-size:1.6em;font-weight:800;margin:4px 0 2px;letter-spacing:-0.02em; }',
            '.jodu-sum-sub { font-size:0.78em;color:#94a3b8;font-weight:500;margin-bottom:6px; }',
            '.jodu-sum-lbl { font-size:0.7em;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:700; }',
            '.jodu-grid-2col { display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px;margin-bottom:16px; }',
            '.jodu-grid-3col { display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px;margin-bottom:16px; }',
            '.jodu-card { background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12);transition:transform 0.2s ease; }',
            '.jodu-card:hover { border-color:rgba(255,255,255,0.14); }',
            '.jodu-card-hdr { display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.06); }',
            '.jodu-card-icon { font-size:1.15em; }',
            '.jodu-card-title { font-size:0.95em;font-weight:700;color:#f8fafc;letter-spacing:0.02em; }',
            '.jodu-card-body { padding:16px; }',
            '.jodu-table { width:100%;border-collapse:collapse;font-size:0.88em; }',
            '.jodu-tr { border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s ease; }',
            '.jodu-tr:hover { background:rgba(255,255,255,0.02); }',
            '.jodu-tr:last-child { border-bottom:none; }',
            '.jodu-th-tr { border-bottom:1px solid rgba(255,255,255,0.1); }',
            '.jodu-th { text-align:left;padding:6px 8px;font-size:0.78em;color:#64748b;font-weight:700;letter-spacing:0.04em;text-transform:uppercase; }',
            '.jodu-td-lbl { padding:8px 8px;color:#94a3b8; }',
            '.jodu-td-val { padding:8px 8px;text-align:right;color:#f8fafc; }',
            '.jodu-td-val.jodu-has-color { font-weight:600; }',
            '.jodu-dot { display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;vertical-align:middle; }',
            '.jodu-badge { font-size:0.75em;padding:3px 8px;border-radius:6px;font-weight:600;display:inline-block; }',
            '.jodu-btn-sm { font-size:0.78em;padding:4px 10px;border-radius:6px;font-weight:600; }',
            '.jodu-gauge-center { position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center; }',
            '.jodu-gauge-val { font-size:1.65em;font-weight:800;line-height:1;letter-spacing:-0.02em; }',
            '.jodu-gauge-sub { font-size:0.75em;color:#64748b;margin-top:4px;font-weight:600; }',
            '.jodu-stat-row { display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.86em; }',
            '.jodu-stat-lbl { color:#94a3b8; }',
            '.jodu-stat-val { font-weight:600;color:#f8fafc; }',
            '.jodu-subheading { text-align:center;color:#64748b;font-size:0.72em;letter-spacing:0.1em;text-transform:uppercase;margin:14px 0 6px;font-weight:700; }',
            '.jodu-bar-track { background:rgba(255,255,255,0.08);border-radius:6px;height:8px;overflow:hidden; }',
            '.jodu-bar-fill { height:100%;border-radius:6px;transition:width 0.35s ease; }',
            '.jodu-alert-box { margin-top:10px;padding:8px 12px;border-radius:8px;font-size:0.82em;line-height:1.4;font-weight:500; }',
            '.jodu-alert-banner { margin-bottom:16px;padding:12px;border-radius:10px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#60a5fa;font-weight:600;text-align:center; }',
            '.jodu-paused-box { text-align:center;padding:55px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:14px; }',
            '.jodu-idle-panel { padding:24px 0;text-align:center;color:#888; }',
            '.jodu-loading-box { text-align:center;padding:70px 20px; }',
            '.jodu-spinner { width:38px;height:38px;margin:0 auto;border:3px solid rgba(255,255,255,0.1);border-top-color:#38bdf8;border-radius:50%;animation:jodu-spin 0.8s linear infinite; }',
            '@keyframes jodu-spin { to { transform:rotate(360deg); } }',
            '.jodu-modal-sec { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px 14px; margin-bottom:12px; }',
            '.jodu-modal-sec-title { font-size:0.78em; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px; display:flex; align-items:center; }',
            '.jodu-modal-field { margin-bottom:10px; }',
            '.jodu-modal-field:last-child { margin-bottom:0; }',
            '.jodu-modal-label { display:block; margin-bottom:4px; color:#94a3b8; font-size:0.82em; font-weight:600; }',
            '.jodu-modal-hint { font-size:0.74em; color:#64748b; margin-top:3px; }'
        ]);

        var topBar = E('div', { 'class': 'jodu-top-bar' }, [
            E('div', { 'class': 'jodu-title-block' }, [
                E('h2', {}, 'JODU51641 / JODU51642 Status Dashboard'),
                E('div', { 'class': 'jodu-subtitle' }, 'Real-Time Sercomm 5G ODU Monitoring & Telemetry')
            ]),
            E('div', { 'class': 'jodu-actions' }, [
                toggleBtn,
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