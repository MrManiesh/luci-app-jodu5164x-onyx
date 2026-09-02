'use strict';
'require view';
'require fs';
'require ui';
'require uci';
'require poll';

return view.extend({
    handleSaveApply: null,
    handleSave: null,
    handleReset: null,

    load: function() {
        return Promise.resolve();
    },

    render: function() {
        var isConfiguring = false;

        var style = document.createElement('style');
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            

            #cbi-jodu5164x {
                font-family: 'Inter', sans-serif;
                color: #e2e8f0;
                margin-top: 10px;
            }
            
            .sa-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
            .sa-title-row { display: flex; align-items: center; gap: 15px; width: auto; }
            .sa-header-actions { display: flex; align-items: center; gap: 8px; }
            .sa-header-bar h2 { margin: 0; white-space: nowrap; line-height: 1; font-weight: 800; font-size: 24px; color: #f8fafc; }
            
            .sa-badge {
                font-size: 13px;
                font-weight: 500;
                color: #38bdf8;
                background: rgba(56,189,248,0.1);
                border: 1px solid rgba(56,189,248,0.3);
                padding: 4px 8px;
                border-radius: 6px;
                margin-left: 10px;
                vertical-align: middle;
            }
            
            .sa-uptime { display: flex; flex-direction: row; align-items: baseline; justify-content: flex-start; margin-top: 2px; }
            .sa-uptime-label { font-size: 13px; color: #94a3b8; font-weight: 500; margin-right: 6px; }
            .sa-uptime-val { font-size: 13px; font-weight: 600; color: #f8fafc; }
            
            .action-btn {
                margin: 0 !important;
                padding: 4px 12px !important;
                height: 28px !important;
                border-radius: 6px !important;
                box-sizing: border-box !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.15s ease;
                border: none !important;
                gap: 6px;
            }
            
            .btn-red {
                background-color: #dc2626 !important;
                border: 1px solid #b91c1c !important;
                box-shadow: 0 0 8px rgba(220, 38, 38, 0.4) !important;
                color: #ffffff !important;
            }
            .btn-red:hover {
                background-color: #b91c1c !important;
                box-shadow: 0 0 12px rgba(220, 38, 38, 0.6) !important;
            }
            
            .btn-blue {
                background-color: #0284c7 !important;
                border: 1px solid #0369a1 !important;
                box-shadow: 0 0 8px rgba(2, 132, 199, 0.4) !important;
                color: #ffffff !important;
            }
            .btn-blue:hover {
                background-color: #0369a1 !important;
                box-shadow: 0 0 12px rgba(2, 132, 199, 0.6) !important;
            }

            .sa-grid-top { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px; margin-bottom: 20px; }
            
            .sa-card { 
                padding: 16px 15px; 
                text-align: center; 
                border-radius: 12px; 
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.15);
            } 
            
            .sa-icon { width: 42px; height: 42px; margin: 0 auto 12px auto; display: flex; align-items: center; justify-content: center; }
            .sa-card h2 { margin: 6px 0; font-size: 22px; font-weight: 700; }
            .sa-card span { font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #94a3b8; }
            
            .sa-grid-mid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-bottom: 20px; }
            
            .sa-grid-bot { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; margin-bottom: 20px; }
            
            .cbi-section h3 { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 12px; }
            
            .sa-transparent-node { 
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 8px; 
                overflow: hidden; 
            }
            .sa-table { width: 100%; border-collapse: collapse; }
            .sa-tr { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
            .sa-tr:last-child { border-bottom: none; }
            
            .sa-td { padding: 10px 14px; font-size: 13px; }
            .sa-td.left { font-weight: 500; color: #94a3b8; width: 45%; } 
            .sa-td.right { text-align: right; font-weight: 600; width: 55%; color: #e2e8f0; }
            .val-highlight { font-size: 14px; font-family: monospace; }
            
            .btn-lock-cell {
                background-color: #0284c7 !important;
                border: 1px solid #0369a1 !important;
                box-shadow: 0 0 6px rgba(2, 132, 199, 0.3) !important;
                color: #ffffff !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                padding: 4px 14px !important;
                border-radius: 6px !important;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-block;
            }
            .btn-lock-cell:hover {
                background-color: #0369a1 !important;
                box-shadow: 0 0 10px rgba(2, 132, 199, 0.5) !important;
            }

            .badge-active-cell {
                font-size: 11px !important;
                font-weight: 700 !important;
                color: #38bdf8 !important;
                background: rgba(56, 189, 248, 0.15) !important;
                border: 1px solid rgba(56, 189, 248, 0.4) !important;
                padding: 4px 10px !important;
                border-radius: 6px !important;
                display: inline-block;
                letter-spacing: 0.5px;
            }
            
            .cbi-page-actions { display: none !important; }
            
            @media (max-width: 900px) { 
                .sa-grid-bot { grid-template-columns: 1fr; } 
            }
            
            @media (max-width: 650px) {
                .sa-title-row { width: 100%; justify-content: space-between; gap: 10px; }
                .sa-uptime { justify-content: flex-end; margin-top: 0; }
                .sa-header-actions { width: 100%; }
                .action-btn { flex: 1; height: 38px !important; font-size: 14px !important; }
                .sa-card { padding: 15px 12px; }
                .sa-card h2 { font-size: 20px; }
                .sa-td { padding: 8px 10px; }
            }
        `;
        document.head.appendChild(style);

        var container = document.createElement('div');
        container.className = 'cbi-map';
        container.id = 'cbi-jodu5164x';
        container.innerHTML = `
            <div class="sa-header-bar">
                <div class="sa-title-row">
                    <h2 name="content">
                        5G Dashboard
                        <span class="sa-badge" id="ui-model-badge">JODU51641</span>
                    </h2>
                    <div class="sa-uptime">
                        <span class="sa-uptime-label">Uptime:</span>
                        <span id="ui-uptime-val" class="sa-uptime-val">--</span>
                    </div>
                </div>
                
                <div class="sa-header-actions">
                    <button class="btn action-btn btn-red" id="odu-reboot-btn">
                        <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        <span style="color:#ffffff !important;">Reboot</span>
                    </button>
                    <button class="btn action-btn btn-blue" id="odu-settings-btn">
                        <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span style="color:#ffffff !important;">Settings</span>
                    </button>
                </div>
            </div>

            <div class="sa-grid-top">
                <div class="cbi-section-node sa-card">
                    <div class="sa-icon">
                        <img src="/luci-static/resources/view/jodu5164x/jio-logo.png" style="width: 48px; height: 48px; border-radius: 50%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));" alt="Jio Logo">
                    </div>
                    <h2 style="color: #60a5fa; text-shadow: 0 0 15px rgba(96,165,250,0.4);">JioTrue 5G</h2>
                    <span id="ui-top-mode">--</span>
                </div>
                <div class="cbi-section-node sa-card">
                    <div class="sa-icon" id="icon-cpu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                            <rect x="9" y="9" width="6" height="6"/>
                            <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
                            <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
                            <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
                            <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                        </svg>
                    </div>
                    <h2 id="ui-cpu">--%</h2><span>CPU Usage <span id="ui-temp" style="color:#facc15; margin-left: 5px; font-weight: 500;">(--°C)</span></span>
                </div>
                <div class="cbi-section-node sa-card">
                    <div class="sa-icon" id="icon-sig">
                        <svg viewBox="0 0 24 24" fill="none" width="36" height="36">
                            <rect x="2" y="16" width="3" height="6" rx="1.5" fill="#334155"/>
                            <rect x="7" y="12" width="3" height="10" rx="1.5" fill="#334155"/>
                            <rect x="12" y="8" width="3" height="14" rx="1.5" fill="#334155"/>
                            <rect x="17" y="4" width="3" height="18" rx="1.5" fill="#334155"/>
                        </svg>
                    </div>
                    <h2 id="ui-sig-pct">--%</h2><span>Signal Quality</span>
                </div>
                <div class="cbi-section-node sa-card">
                    <div class="sa-icon" id="icon-conn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M17.31 17.31A10.43 10.43 0 0 1 12 19c-7 0-10-7-10-7a13.23 13.23 0 0 1 7.58-6.19"/><path d="M14 14.66V17c0 .55-.47.98-.97 1.21C11.69 18.75 10 18.24 10 17v-2.34"/><path d="m2 2 20 20"/></svg>
                    </div>
                    <h2 id="ui-state" style="color: #f43f5e; text-shadow: 0 0 15px rgba(244,63,94,0.4);">LINK DOWN</h2><span>Connection</span>
                </div>
            </div>

            <div class="sa-grid-mid">
                <div class="cbi-section-node sa-card" style="padding: 12px 15px; display: flex; justify-content: space-evenly; align-items: center; flex-direction: row; flex-wrap: wrap;">
                    <div style="font-weight: 600; color: #f8fafc; font-size: 14px;">Data Usage (Session)</div>
                    <div style="display: flex; gap: 30px;">
                        <div style="text-align: center;"><span style="font-size: 11px; color:#94a3b8;">DOWNLOAD</span> <b id="ui-rx-bytes" style="font-size: 16px; color: #4ade80;">0 B</b></div>
                        <div style="text-align: center;"><span style="font-size: 11px; color:#94a3b8;">UPLOAD</span> <b id="ui-tx-bytes" style="font-size: 16px; color: #38bdf8;">0 B</b></div>
                    </div>
                </div>
            </div>

            <div class="sa-grid-bot">
                <div class="cbi-section">
                    <h3>Cellular Parameters (Primary Cell)</h3>
                    <div class="sa-transparent-node">
                        <table class="sa-table">
                            <tr class="sa-tr"><td class="sa-td left">Duplex Mode</td><td class="sa-td right val-highlight" id="ui-duplex">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Band</td><td class="sa-td right val-highlight" id="ui-band">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Bandwidth</td><td class="sa-td right val-highlight" id="ui-bw">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">NR-ARFCN</td><td class="sa-td right val-highlight" id="ui-arfcn">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Physical Cell ID</td><td class="sa-td right val-highlight" id="ui-pcid">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Modulation</td><td class="sa-td right val-highlight" id="ui-mod">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">BLER</td><td class="sa-td right val-highlight" id="ui-bler">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">MIMO</td><td class="sa-td right val-highlight" id="ui-mimo">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">RSRP</td><td class="sa-td right val-highlight" id="ui-rsrp">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">RSRQ</td><td class="sa-td right val-highlight" id="ui-rsrq" style="color: #f472b6;">--</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">SINR</td><td class="sa-td right val-highlight" id="ui-sinr" style="color: #38bdf8;">--</td></tr>
                        </table>
                    </div>
                </div>

                <div class="cbi-section">
                    <h3>Cellular Parameters (Secondary Cell)</h3>
                    <div class="sa-transparent-node">
                        <table class="sa-table">
                            <tr class="sa-tr"><td class="sa-td left">Aggregation Status</td><td class="sa-td right val-highlight" id="ui-ca-status">Inactive</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Band</td><td class="sa-td right val-highlight" id="ui-scc-band">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Bandwidth</td><td class="sa-td right val-highlight" id="ui-scc-bw">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">NR-ARFCN</td><td class="sa-td right val-highlight" id="ui-scc-arfcn">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Physical Cell ID</td><td class="sa-td right val-highlight" id="ui-scc-pcid">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">Modulation</td><td class="sa-td right val-highlight" id="ui-scc-mod">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">BLER</td><td class="sa-td right val-highlight" id="ui-scc-bler">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">MIMO</td><td class="sa-td right val-highlight" id="ui-scc-mimo">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">RSRP</td><td class="sa-td right val-highlight" id="ui-scc-rsrp">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">RSRQ</td><td class="sa-td right val-highlight" id="ui-scc-rsrq" style="color: #f472b6;">NA</td></tr>
                            <tr class="sa-tr"><td class="sa-td left">SINR</td><td class="sa-td right val-highlight" id="ui-scc-sinr" style="color: #38bdf8;">NA</td></tr>
                        </table>
                    </div>
                </div>
            </div>

            <div class="cbi-section" style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0;">Neighbouring 5G Cells</h3>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn action-btn btn-blue" id="btn-manual-lock">
                            <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span style="color:#ffffff !important;">Manual Lock</span>
                        </button>
                        <button class="btn action-btn btn-red" id="btn-unlock-neigh">
                            <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                            <span style="color:#ffffff !important;">Clear Locks</span>
                        </button>
                        <span class="sa-badge" style="margin-left: 4px; background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); color: #94a3b8;"><span id="ui-neigh-count">0</span> Cells Found</span>
                    </div>
                </div>
                <div class="sa-transparent-node" style="overflow-x: auto;">
                    <table class="sa-table" style="min-width: 600px;">
                        <thead>
                            <tr style="color: #94a3b8; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                <th style="padding: 12px 10px; width: 20%; text-align: center;">NR-ARFCN</th>
                                <th style="padding: 12px 10px; width: 20%; text-align: center;">PCI</th>
                                <th style="padding: 12px 10px; width: 20%; text-align: center;">RSRP</th>
                                <th style="padding: 12px 10px; width: 20%; text-align: center;">RSRQ</th>
                                <th style="padding: 12px 14px; width: 20%; text-align: center;">Quick Action</th>
                            </tr>
                        </thead>
                        <tbody id="ui-neighbor-tbody">
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">
                                    Scanning for neighbouring 5G NR cells...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        function applyCellLock(targetArfcn, targetPci) {
            isConfiguring = true;
            var stateEl = document.getElementById('ui-state');
            var iconEl = document.getElementById('icon-conn');
            var secondsLeft = 5;
            var baseText = (targetArfcn && targetPci) ? 'LOCKING CELL' : (targetArfcn || targetPci ? 'APPLYING LOCK' : 'UNLOCKING CELL');
            
            if (stateEl && iconEl) {
                stateEl.innerText = baseText + ' (' + secondsLeft + 's)';
                stateEl.style.color = '#03dac6';
                stateEl.style.textShadow = '0 0 15px rgba(3,218,198,0.4)';
                iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#03dac6"><path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2M12 20A8 8 0 1 1 20 12A8 8 0 0 1 12 20M12 4A8 8 0 0 0 4 12H6A6 6 0 0 1 12 6V4Z"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>';
                
                var countdownTimer = setInterval(function() {
                    secondsLeft--;
                    if (secondsLeft > 0) {
                        stateEl.innerText = baseText + ' (' + secondsLeft + 's)';
                    } else {
                        clearInterval(countdownTimer);
                        window.location.reload();
                    }
                }, 1000);
            }

            var lockCmd = (targetArfcn && targetPci) 
                ? ('/usr/libexec/jodu5164x_lock.sh "' + targetArfcn + '" "' + targetPci + '"') 
                : '/usr/libexec/jodu5164x_lock.sh "" ""';

            var cmds = [
                'uci set jodu5164x.main.arfcn="' + (targetArfcn || '') + '"',
                'uci set jodu5164x.main.pci="' + (targetPci || '') + '"',
                'uci commit jodu5164x',
                lockCmd
            ].join('; ');

            fs.exec_direct('/bin/sh', ['-c', cmds]).catch(function(e) {});
        }

        function openManualLockModal() {
            uci.load('jodu5164x').then(function() {
                var curArfcn = uci.get('jodu5164x', 'main', 'arfcn') || '';
                var curPci = uci.get('jodu5164x', 'main', 'pci') || '';

                var body = document.createElement('div');
                body.innerHTML = `
                    <div style="margin-bottom: 15px; color: #94a3b8; font-size: 13px;">
                        Manually configure target 5G NR carrier channel (ARFCN) and Physical Cell ID (PCI).
                    </div>
                    <div class="cbi-value">
                        <label class="cbi-value-title">NR-ARFCN</label>
                        <div class="cbi-value-field">
                            <input type="text" id="manual-lock-arfcn" class="cbi-input-text" placeholder="e.g. 634080" value="${curArfcn}" autocomplete="off">
                        </div>
                    </div>
                    <div class="cbi-value">
                        <label class="cbi-value-title">Physical Cell ID (PCI)</label>
                        <div class="cbi-value-field">
                            <input type="text" id="manual-lock-pci" class="cbi-input-text" placeholder="e.g. 263 (Leave blank for ARFCN only)" value="${curPci}" autocomplete="off">
                        </div>
                    </div>
                `;

                var btnWrap = document.createElement('div');
                btnWrap.className = 'right';
                btnWrap.style.marginTop = '20px';

                var btnCancel = document.createElement('button');
                btnCancel.className = 'btn';
                btnCancel.innerText = 'Cancel';
                btnCancel.onclick = ui.hideModal;
                btnWrap.appendChild(btnCancel);

                var btnLock = document.createElement('button');
                btnLock.className = 'btn cbi-button-action important';
                btnLock.style.marginLeft = '8px';
                btnLock.innerText = 'Lock Cell';
                btnLock.onclick = function() {
                    var inArfcn = (document.getElementById('manual-lock-arfcn') ? document.getElementById('manual-lock-arfcn').value.trim() : '');
                    var inPci = (document.getElementById('manual-lock-pci') ? document.getElementById('manual-lock-pci').value.trim() : '');
                    if (!inArfcn) {
                        alert('Please enter a valid NR-ARFCN.');
                        return;
                    }
                    ui.hideModal();
                    applyCellLock(inArfcn, inPci);
                };
                btnWrap.appendChild(btnLock);

                body.appendChild(btnWrap);
                ui.showModal('Manual Cell Lock (JODU5164x)', [body]);
            });
        }

        function openConfirmModal(title, msg, onConfirm) {
            var body = document.createElement('div');
            body.innerHTML = `<div style="padding: 10px 0; color: #e2e8f0; font-size: 14px;">${msg}</div>`;

            var btnWrap = document.createElement('div');
            btnWrap.className = 'right';
            btnWrap.style.marginTop = '20px';

            var btnCancel = document.createElement('button');
            btnCancel.className = 'btn';
            btnCancel.innerText = 'Cancel';
            btnCancel.onclick = ui.hideModal;
            btnWrap.appendChild(btnCancel);

            var btnOk = document.createElement('button');
            btnOk.className = 'btn cbi-button-action important';
            btnOk.style.marginLeft = '8px';
            btnOk.innerText = 'Confirm';
            btnOk.onclick = function() {
                ui.hideModal();
                onConfirm();
            };
            btnWrap.appendChild(btnOk);

            body.appendChild(btnWrap);
            ui.showModal(title, [body]);
        }

        function openSettingsModal() {
            uci.unload('jodu5164x');
            uci.load('jodu5164x').then(function() {
                var ip = uci.get('jodu5164x', 'main', 'ip') || uci.get('jodu5164x', 'main', 'host') || '192.168.225.1';
                var user = uci.get('jodu5164x', 'main', 'user') || uci.get('jodu5164x', 'main', 'telnet_username') || '';
                var pass = uci.get('jodu5164x', 'main', 'pass') || uci.get('jodu5164x', 'main', 'telnet_password') || '';
                
                var body = document.createElement('div');
                body.innerHTML = `
                    <ul class="cbi-tabmenu">
                        <li class="cbi-tab" id="tab-terminal"><a href="javascript:void(0);">Terminal</a></li>
                        <li class="cbi-tab-disabled" id="tab-config"><a href="javascript:void(0);">Config</a></li>
                    </ul>
                    
                    <div id="container-terminal" style="margin-top: 15px;">
                        <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); color: #a78bfa; padding: 15px; border-radius: 8px; font-family: monospace; min-height: 200px; max-height: 400px; overflow-y: auto; margin-bottom: 15px; font-size: 13px;" id="odu-term-out">
                            <div>Welcome to Jio ODU 5164x Diagnostic Terminal.</div>
                            <div style="color: #64748b;">Supports both AT commands (AT+BNRINFO, AT+NRCAINFO, AT+BNRCELLH) and CRI commands (cricli signal, cricli get_perso_info).</div><br>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="odu-term-in" class="cbi-input-text" placeholder="e.g. AT+BNRINFO or cricli signal" style="flex: 1; font-family: monospace;" autocomplete="off">
                            <button class="btn cbi-button-action important" id="odu-term-send">Send</button>
                        </div>
                    </div>
                    
                    <div id="container-config" style="display: none; margin-top: 15px;">
                        <div class="cbi-value">
                            <label class="cbi-value-title">ODU IP Address</label>
                            <div class="cbi-value-field">
                                <input type="text" id="cfg-ip" class="cbi-input-text" value="${ip}" autocomplete="off" data-lpignore="true">
                            </div>
                        </div>
                        <div class="cbi-value">
                            <label class="cbi-value-title">Telnet Username</label>
                            <div class="cbi-value-field">
                                <input type="text" id="cfg-user" class="cbi-input-text" placeholder="root (Leave blank if no login required)" value="${user}" autocomplete="off" data-lpignore="true">
                            </div>
                        </div>
                        <div class="cbi-value">
                            <label class="cbi-value-title">Telnet Password</label>
                            <div class="cbi-value-field">
                                <input type="password" id="cfg-pass" class="cbi-input-text" placeholder="oelinux123 (Leave blank if no password)" value="${pass}" autocomplete="new-password" data-lpignore="true">
                            </div>
                        </div>
                    </div>
                `;

                var btnWrap = document.createElement('div');
                btnWrap.className = 'right';
                btnWrap.style.marginTop = '20px';
                
                var btnCancel = document.createElement('button');
                btnCancel.className = 'btn';
                btnCancel.innerText = 'Close';
                btnCancel.onclick = ui.hideModal;
                btnWrap.appendChild(btnCancel);
                
                var btnSave = document.createElement('button');
                btnSave.className = 'btn cbi-button-action important';
                btnSave.innerText = 'Save & Apply';
                btnSave.id = 'btn-save-settings';
                btnSave.style.display = 'none';
                btnWrap.appendChild(btnSave);
                
                body.appendChild(btnWrap);
                ui.showModal('Settings (JODU5164x)', [body]);
                
                var tTerminal = document.getElementById('tab-terminal');
                var tConfig = document.getElementById('tab-config');
                var cTerminal = document.getElementById('container-terminal');
                var cConfig = document.getElementById('container-config');
                var bSave = document.getElementById('btn-save-settings');
                
                tTerminal.onclick = function() {
                    tTerminal.className = 'cbi-tab';
                    tConfig.className = 'cbi-tab-disabled';
                    cTerminal.style.display = 'block';
                    cConfig.style.display = 'none';
                    bSave.style.display = 'none';
                    var inField = document.getElementById('odu-term-in');
                    if (inField) inField.focus();
                };
                
                tConfig.onclick = function() {
                    tConfig.className = 'cbi-tab';
                    tTerminal.className = 'cbi-tab-disabled';
                    cConfig.style.display = 'block';
                    cTerminal.style.display = 'none';
                    bSave.style.display = 'inline-block';
                };
                
                var inEl = document.getElementById('odu-term-in');
                var outEl = document.getElementById('odu-term-out');
                var sendBtn = document.getElementById('odu-term-send');
                
                var executeCmd = function() {
                    var cmd = inEl.value.trim();
                    if (!cmd) return;
                    
                    var outDiv = document.createElement('div');
                    outDiv.style.color = '#38bdf8';
                    outDiv.innerText = '> ' + cmd;
                    outEl.appendChild(outDiv);
                    
                    var waitDiv = document.createElement('div');
                    waitDiv.style.color = '#94a3b8';
                    waitDiv.innerText = 'Executing...';
                    outEl.appendChild(waitDiv);
                    outEl.scrollTop = outEl.scrollHeight;
                    
                    inEl.value = '';
                    inEl.disabled = true;
                    sendBtn.disabled = true;
                    
                    fs.exec_direct('/usr/libexec/jodu5164x_at.sh', [cmd]).then(function(res) {
                        waitDiv.innerText = (res && res.trim() !== '') ? res.trim() : 'OK';
                        waitDiv.style.color = '#f8fafc';
                        outEl.scrollTop = outEl.scrollHeight;
                    }).catch(function(e) {
                        waitDiv.innerText = 'Error: ' + e;
                        waitDiv.style.color = '#ef4444';
                        outEl.scrollTop = outEl.scrollHeight;
                    }).finally(function() {
                        inEl.disabled = false;
                        sendBtn.disabled = false;
                        inEl.focus();
                    });
                };
                
                sendBtn.onclick = executeCmd;
                inEl.onkeypress = function(e) {
                    if (e.key === 'Enter') executeCmd();
                };
                
                btnSave.onclick = function() {
                    var newIp = (document.getElementById('cfg-ip') ? document.getElementById('cfg-ip').value.trim() : '') || '192.168.225.1';
                    var newUser = (document.getElementById('cfg-user') ? document.getElementById('cfg-user').value.trim() : '');
                    var newPass = (document.getElementById('cfg-pass') ? document.getElementById('cfg-pass').value.trim() : '');
                    
                    btnSave.innerText = 'Applying...';
                    btnSave.disabled = true;
                    
                    ui.hideModal();
                    
                    var cmds = [
                        'uci set jodu5164x.main.ip="' + newIp + '"',
                        'uci set jodu5164x.main.user="' + newUser + '"',
                        'uci set jodu5164x.main.pass="' + newPass + '"',
                        'uci commit jodu5164x'
                    ].join('; ');
                    
                    fs.exec_direct('/bin/sh', ['-c', cmds]).then(function() {
                        window.location.reload();
                    }).catch(function(e) {});
                };
            });
        }

        var btnSettings = container.querySelector('#odu-settings-btn');
        btnSettings.addEventListener('click', function() {
            openSettingsModal();
        });

        var rebootBtn = container.querySelector('#odu-reboot-btn');
        rebootBtn.addEventListener('click', function() {
            openConfirmModal('Reboot Jio ODU', 'Are you sure you want to reboot the connected Jio 5G ODU?', function() {
                isConfiguring = true; 
                
                var stateEl = document.getElementById('ui-state');
                var iconEl = document.getElementById('icon-conn');
                var secondsLeft = 60; 
                
                if (stateEl && iconEl) {
                    stateEl.style.color = '#ef4444'; 
                    stateEl.style.textShadow = '0 0 15px rgba(239,68,68,0.4)'; 
                    iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36"><circle cx="20" cy="20" r="16" fill="none" stroke="#334155" stroke-width="3"/><circle cx="20" cy="20" r="16" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="25 75" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite"/></circle><circle cx="20" cy="20" r="8" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="10 40" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="360 20 20" to="0 20 20" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="20" cy="20" r="3" fill="#ef4444"><animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle></svg>';
                    stateEl.innerText = 'REBOOTING ODU (' + secondsLeft + 's)';
                    
                    var countdownTimer = setInterval(function() {
                        secondsLeft--;
                        if (secondsLeft > 0) {
                            stateEl.innerText = 'REBOOTING ODU (' + secondsLeft + 's)';
                        } else {
                            clearInterval(countdownTimer);
                            window.location.reload();
                        }
                    }, 1000);
                } else {
                    setTimeout(function() { window.location.reload(); }, 60000); 
                }
                
                var cmds = "/usr/libexec/jodu5164x_reboot.sh >/dev/null 2>&1 &";
                fs.exec_direct('/bin/sh', ['-c', cmds]).catch(function(e) {});
            });
        });

        var btnClearLocks = container.querySelector('#btn-unlock-neigh');
        if (btnClearLocks) {
            btnClearLocks.addEventListener('click', function() {
                openConfirmModal('Clear Cell Locks', 'Are you sure you want to clear active cell locks and return to Auto mode?', function() {
                    applyCellLock('', '');
                });
            });
        }

        var btnManualLock = container.querySelector('#btn-manual-lock');
        if (btnManualLock) {
            btnManualLock.addEventListener('click', function() {
                openManualLockModal();
            });
        }

        if (window.odu5164xUptimeTicker) clearInterval(window.odu5164xUptimeTicker);
        window.odu5164xUptimeTicker = setInterval(function() {
            if (isConfiguring) return;
            var el = document.getElementById('ui-uptime-val');
            if (!el) return; 
            
            if (window.odu5164xBootTime) {
                var up = Math.floor((Date.now() - window.odu5164xBootTime) / 1000);
                if (up >= 0) {
                    var d = Math.floor(up / 86400);
                    var h = Math.floor((up % 86400) / 3600);
                    var m = Math.floor((up % 3600) / 60);
                    var s = up % 60;
                    var upStr = '';
                    if (d > 0) upStr += d + 'd ';
                    if (h > 0) upStr += h + 'h ';
                    if (m > 0) upStr += m + 'm ';
                    upStr += s + 's';
                    el.innerText = upStr;
                }
            }
        }, 1000);

        function formatBytes(bytes) {
            var b = parseInt(bytes, 10);
            if (isNaN(b) || b === 0) return '0 B';
            var k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            var i = Math.floor(Math.log(b) / Math.log(k));
            return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        poll.add(function() {
            if (isConfiguring) return; 

            return fs.exec_direct('/usr/libexec/jodu5164x-data.sh').then(function(res) {
                if (isConfiguring) return; 
                
                try { 
                    if (!res) return;
                    var data = JSON.parse(res.trim()); 
                    
                    if (data.uptime && data.uptime !== "0" && !isConfiguring) {
                        var up = parseInt(data.uptime, 10);
                        if (!isNaN(up) && up > 0) {
                            var bt = Date.now() - (up * 1000);
                            window.odu5164xBootTime = bt;
                        }
                    }

                    var stateEl = document.getElementById('ui-state');
                    var iconEl = document.getElementById('icon-conn');

                    if (data.cpu) {
                        var cpuVal = parseInt(data.cpu, 10);
                        if (!isNaN(cpuVal)) {
                            var cCol = '#4ade80';
                            if (cpuVal >= 35) cCol = '#facc15';
                            if (cpuVal >= 70) cCol = '#ef4444';
                            
                            var cpuEl = document.getElementById('ui-cpu');
                            if (cpuEl) {
                                cpuEl.innerText = cpuVal + '%';
                                cpuEl.style.color = cCol;
                                cpuEl.style.textShadow = '0 0 15px ' + cCol + '66';
                            }
                            var iCpu = document.getElementById('icon-cpu');
                            if (iCpu) {
                                iCpu.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="' + cCol + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>';
                            }
                        }
                    }

                    if (data.temp) {
                        var tempVal = parseInt(data.temp, 10);
                        if (!isNaN(tempVal)) {
                            var tCol = '#4ade80';
                            if (tempVal >= 41 && tempVal <= 45) tCol = '#facc15';
                            else if (tempVal >= 46) tCol = '#ef4444';
                            
                            var tempEl = document.getElementById('ui-temp');
                            if (tempEl) {
                                tempEl.innerText = '(' + tempVal + '°C)';
                                tempEl.style.color = tCol;
                            }
                        }
                    }

                    if (data.server_link === 'PROVISIONING') {
                        if (stateEl) {
                            stateEl.className = '';
                            stateEl.innerText = 'PROVISIONING';
                            stateEl.style.color = '#2dd4bf'; 
                            stateEl.style.textShadow = '0 0 15px rgba(45,212,191,0.4)'; 
                        }
                        if (iconEl) {
                            iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><circle cx="12" cy="12" r="2" fill="#2dd4bf"/><circle cx="12" cy="12" r="6"><animate attributeName="r" values="2; 10" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1; 0" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="12" cy="12" r="10"><animate attributeName="r" values="2; 10" dur="1.5s" begin="0.75s" repeatCount="indefinite"/><animate attributeName="opacity" values="1; 0" dur="1.5s" begin="0.75s" repeatCount="indefinite"/></circle></svg>';
                        }
                        return; 
                    }

                    if (data.server_link === 'OFFLINE') {
                        if (stateEl) {
                            stateEl.className = '';
                            stateEl.innerText = 'LINK DOWN';
                            stateEl.style.color = '#f43f5e';
                            stateEl.style.textShadow = '0 0 15px rgba(244,63,94,0.4)'; 
                        }
                        if (iconEl) {
                            iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M17.31 17.31A10.43 10.43 0 0 1 12 19c-7 0-10-7-10-7a13.23 13.23 0 0 1 7.58-6.19"/><path d="M14 14.66V17c0 .55-.47.98-.97 1.21C11.69 18.75 10 18.24 10 17v-2.34"/><path d="m2 2 20 20"/></svg>';
                        }
                        return; 
                    }

                    if (stateEl) {
                        stateEl.className = '';
                        stateEl.innerText = 'LINK ACTIVE';
                        stateEl.style.color = '#4ade80';
                        stateEl.style.textShadow = '0 0 15px rgba(74,222,128,0.4)'; 
                    }
                    if (iconEl) {
                        iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
                    }
                    
                    var topModeEl = document.getElementById('ui-top-mode');
                    if (topModeEl) topModeEl.innerText = (data.mccmnc && data.mccmnc !== '--' ? data.mccmnc : '405869') + ' | NR5G-SA';

                    var modelEl = document.getElementById('ui-model-badge');
                    if (modelEl) {
                        if (data.odu_cpu_model && (data.odu_cpu_model.indexOf('51641') !== -1 || data.odu_cpu_model.indexOf('51642') !== -1)) {
                            modelEl.innerText = data.odu_cpu_model;
                        } else {
                            var is51642 = (data.band === 'n258' || data.scc_band === 'n258');
                            modelEl.innerText = is51642 ? 'JODU51642' : 'JODU51641';
                        }
                    }

                    if (data.duplex && data.duplex !== '--') window.lastKnownDuplex = data.duplex;
                    var isUp = (data.server_link !== 'OFFLINE' && data.server_link !== 'PROVISIONING');

                    var getVal = function(key, conditionFn) {
                        var val = data[key];
                        var isValid = val && val !== '--' && val !== 'NA' && (!conditionFn || conditionFn(val));
                        
                        if (isValid) {
                            window['lastKnown_' + key] = val;
                            return val;
                        } else if (isUp && window['lastKnown_' + key] !== undefined) {
                            return window['lastKnown_' + key];
                        } else {
                            return '--';
                        }
                    };

                    var curDuplex = getVal('duplex');
                    var curBand = getVal('band');
                    var curBw = getVal('bw');
                    var curArfcn = getVal('arfcn');
                    var curPcid = getVal('pcid');
                    var curMod = getVal('mod', function(v) { return v.indexOf('--') === -1; });
                    var curMimo = getVal('mimo', function(v) { return v.indexOf('--') === -1; });
                    var curBler = getVal('bler', function(v) { return v.indexOf('--') === -1; });
                    var curRsrp = getVal('rsrp');
                    var curRsrq = getVal('rsrq');
                    var curSinr = getVal('sinr');

                    if (curMod === '--') curMod = 'DL:-- UL:--';
                    if (curMimo === '--') curMimo = '--';
                    if (curBler === '--') curBler = '--';

                    var el;
                    el = document.getElementById('ui-duplex'); if (el) el.innerText = curDuplex;
                    el = document.getElementById('ui-band'); if (el) el.innerText = curBand;
                    el = document.getElementById('ui-bw'); if (el) el.innerText = (curBw !== '--' ? curBw + ' MHz' : '--');
                    el = document.getElementById('ui-arfcn'); if (el) el.innerText = curArfcn;
                    el = document.getElementById('ui-pcid'); if (el) el.innerText = curPcid;
                    el = document.getElementById('ui-mod'); if (el) el.innerText = curMod;
                    el = document.getElementById('ui-mimo'); if (el) el.innerText = curMimo;

                    var rsrp = parseInt(curRsrp, 10); if (isNaN(rsrp)) rsrp = -130;
                    var rsrq = parseInt(curRsrq, 10); if (isNaN(rsrq)) rsrq = -20;
                    var sinr = parseInt(curSinr, 10); if (isNaN(sinr)) sinr = 0;

                    var rsrpCol = '#f43f5e'; 
                    if (rsrp >= -85) rsrpCol = '#4ade80'; 
                    else if (rsrp >= -100) rsrpCol = '#fbbf24'; 
                    var uiRsrp = document.getElementById('ui-rsrp');
                    if (uiRsrp) {
                        uiRsrp.innerText = (curRsrp === '--' ? '--' : rsrp + ' dBm');
                        uiRsrp.style.color = (curRsrp === '--' ? '#94a3b8' : rsrpCol);
                    }

                    var rsrqCol = '#f43f5e';
                    if (rsrq >= -9) rsrqCol = '#4ade80';
                    else if (rsrq >= -13) rsrqCol = '#fbbf24';
                    var uiRsrq = document.getElementById('ui-rsrq');
                    if (uiRsrq) {
                        uiRsrq.innerText = (curRsrq === '--' ? '--' : rsrq + ' dB');
                        uiRsrq.style.color = (curRsrq === '--' ? '#94a3b8' : rsrqCol);
                    }

                    var sinrCol = '#f43f5e';
                    if (sinr >= 15) sinrCol = '#4ade80';
                    else if (sinr >= 5) sinrCol = '#fbbf24';
                    var uiSinr = document.getElementById('ui-sinr');
                    if (uiSinr) {
                        uiSinr.innerText = (curSinr === '--' ? '--' : sinr + ' dB');
                        uiSinr.style.color = (curSinr === '--' ? '#94a3b8' : sinrCol);
                    }

                    var uiBler = document.getElementById('ui-bler');
                    if (uiBler) {
                        var blerVal = curBler;
                        uiBler.innerText = blerVal;
                        if (blerVal !== '--' && blerVal !== 'NA' && blerVal !== 'DL:-- UL:--') {
                            var parseNum = parseFloat(blerVal);
                            if (!isNaN(parseNum)) {
                                if (parseNum >= 10) uiBler.style.color = '#f43f5e';
                                else if (parseNum > 0) uiBler.style.color = '#fbbf24';
                                else uiBler.style.color = '#4ade80';
                            } else {
                                uiBler.style.color = '#4ade80';
                            }
                        } else {
                            uiBler.style.color = (blerVal === 'DL:-- UL:--' || blerVal === '--' ? '#94a3b8' : '#4ade80');
                        }
                    }

                    var qRsrp = Math.max(0, Math.min(100, ((rsrp + 115) / 55) * 100));
                    var qRsrq = Math.max(0, Math.min(100, ((rsrq + 18) / 9) * 100));
                    var qSinr = Math.max(0, Math.min(100, (sinr / 30) * 100));
                    
                    var sigQuality = Math.round((qRsrp * 0.6) + (qRsrq * 0.2) + (qSinr * 0.2));
                    if (isNaN(sigQuality)) sigQuality = 0;
                    
                    var qCol = '#f43f5e';
                    if (sigQuality >= 70) qCol = '#4ade80';
                    else if (sigQuality >= 40) qCol = '#fbbf24';

                    var sigEl = document.getElementById('ui-sig-pct');
                    if (sigEl) {
                        sigEl.innerText = sigQuality + '%';
                        sigEl.style.color = qCol;
                        sigEl.style.textShadow = '0 0 15px ' + qCol + '66';
                    }

                    var activeBars = 0;
                    if (sigQuality >= 80) activeBars = 5;
                    else if (sigQuality >= 60) activeBars = 4;
                    else if (sigQuality >= 40) activeBars = 3;
                    else if (sigQuality >= 20) activeBars = 2;
                    else if (sigQuality > 0) activeBars = 1;

                    var barCoords = [ {x:2,y:17,h:5}, {x:6.5,y:14,h:8}, {x:11,y:11,h:11}, {x:15.5,y:8,h:14}, {x:20,y:5,h:17} ];
                    var sigSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="36" height="36">';
                    for (var i = 0; i < 5; i++) {
                        var fCol = (i < activeBars) ? '#38bdf8' : '#334155'; 
                        sigSvg += '<rect x="'+barCoords[i].x+'" y="'+barCoords[i].y+'" width="3" height="'+barCoords[i].h+'" rx="0.5" fill="'+fCol+'"/>';
                    }
                    sigSvg += '</svg>';
                    var iSig = document.getElementById('icon-sig');
                    if (iSig) iSig.innerHTML = sigSvg;

                    var rx = parseInt(data.rx_bytes, 10) || 0;
                    var tx = parseInt(data.tx_bytes, 10) || 0;
                    var uiRx = document.getElementById('ui-rx-bytes');
                    var uiTx = document.getElementById('ui-tx-bytes');
                    if (uiRx) uiRx.innerText = formatBytes(rx);
                    if (uiTx) uiTx.innerText = formatBytes(tx);

                    if (data.scc_pcid && data.scc_pcid !== "0" && data.scc_pcid !== "--") {
                        el = document.getElementById('ui-ca-status'); if (el) { el.innerText = 'Active (CA)'; el.style.color = '#03dac6'; }
                        el = document.getElementById('ui-scc-band'); if (el) el.innerText = data.scc_band || 'n258';
                        el = document.getElementById('ui-scc-bw'); if (el) el.innerText = (data.scc_bw || '100') + ' MHz';
                        el = document.getElementById('ui-scc-arfcn'); if (el) el.innerText = data.scc_arfcn || '--';
                        el = document.getElementById('ui-scc-pcid'); if (el) el.innerText = data.scc_pcid;
                        el = document.getElementById('ui-scc-mod'); if (el) el.innerText = data.scc_mod || '64QAM';
                        el = document.getElementById('ui-scc-mimo'); if (el) el.innerText = data.scc_mimo || '2x2';
                        el = document.getElementById('ui-scc-rsrp'); if (el) el.innerText = (data.scc_rsrp || '0') + ' dBm';
                        el = document.getElementById('ui-scc-rsrq'); if (el) el.innerText = (data.scc_rsrq || '0') + ' dB';
                        el = document.getElementById('ui-scc-sinr'); if (el) el.innerText = (data.scc_sinr || '0') + ' dB';
                        el = document.getElementById('ui-scc-bler'); if (el) { var sb = data.scc_bler || '0'; el.innerText = sb; var sbn = parseFloat(sb); el.style.color = (isNaN(sbn) || sbn === 0) ? '#4ade80' : (sbn >= 10 ? '#f43f5e' : '#fbbf24'); }
                    } else {
                        el = document.getElementById('ui-ca-status'); if (el) { el.innerText = 'Inactive'; el.style.color = '#94a3b8'; }
                        el = document.getElementById('ui-scc-band'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-bw'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-arfcn'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-pcid'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-mod'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-mimo'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-rsrp'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-rsrq'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-sinr'); if (el) el.innerText = 'NA';
                        el = document.getElementById('ui-scc-bler'); if (el) el.innerText = 'NA';
                    }

                    var nTbody = document.getElementById('ui-neighbor-tbody');
                    var nCountEl = document.getElementById('ui-neigh-count');
                    
                    if (nTbody) {
                        if (data.neighbors && Array.isArray(data.neighbors) && data.neighbors.length > 0) {
                            if (nCountEl) nCountEl.innerText = data.neighbors.length;
                            
                            data.neighbors.sort(function(a, b) {
                                var rA = parseInt(a.rsrp, 10) || -150;
                                var rB = parseInt(b.rsrp, 10) || -150;
                                return rB - rA; 
                            });
                            
                            var rows = '';
                            data.neighbors.forEach(function(n, idx) {
                                var nRsrp = parseInt(n.rsrp, 10) || -130;
                                var nCol = '#f43f5e';
                                if (nRsrp >= -85) nCol = '#4ade80';
                                else if (nRsrp >= -100) nCol = '#fbbf24';
                                
                                var nRsrq = parseFloat(n.rsrq) || -20;
                                var nRsrqCol = '#f43f5e';
                                if (nRsrq >= -8) nRsrqCol = '#4ade80';
                                else if (nRsrq >= -11) nRsrqCol = '#fbbf24';
                                
                                var isLocked = (data.arfcn == n.arfcn && data.pcid == n.pci);
                                
                                rows += '<tr class="sa-tr" style="background: ' + (isLocked ? 'rgba(56,189,248,0.08)' : 'transparent') + ';">';
                                rows += '<td class="sa-td val-highlight" style="padding: 6px 10px; width: 20%; text-align: center;">' + (n.arfcn || '--') + '</td>';
                                rows += '<td class="sa-td val-highlight" style="padding: 6px 10px; width: 20%; text-align: center; color: #facc15;">' + (n.pci || '--') + '</td>';
                                rows += '<td class="sa-td" style="padding: 6px 10px; width: 20%; text-align: center; color: ' + nCol + '; font-weight: 600; font-family: monospace;">' + (n.rsrp || '--') + ' dBm</td>';
                                rows += '<td class="sa-td" style="padding: 6px 10px; width: 20%; text-align: center; color: ' + nRsrqCol + '; font-weight: 600; font-family: monospace;">' + (n.rsrq || '--') + ' dB</td>';
                                rows += '<td class="sa-td" style="padding: 6px 14px; width: 20%; text-align: center;">';
                                if (isLocked) {
                                    rows += '<span class="badge-active-cell" style="padding: 3px 8px !important; font-size: 10px !important;">ACTIVE CELL</span>';
                                } else {
                                    rows += '<button class="btn btn-lock-cell" style="padding: 3px 10px !important; font-size: 10px !important; border-radius: 4px !important;" data-arfcn="' + n.arfcn + '" data-pci="' + n.pci + '">LOCK</button>';
                                }
                                rows += '</td></tr>';
                            });
                            nTbody.innerHTML = rows;

                            var lockButtons = nTbody.querySelectorAll('.btn-lock-cell');
                            lockButtons.forEach(function(btn) {
                                btn.onclick = function() {
                                    var targetArfcn = this.getAttribute('data-arfcn');
                                    var targetPci = this.getAttribute('data-pci');
                                    openConfirmModal('Lock 5G Cell', 'Are you sure you want to lock to ARFCN <b>' + targetArfcn + '</b> & PCI <b>' + targetPci + '</b>?', function() {
                                        applyCellLock(targetArfcn, targetPci);
                                    });
                                };
                            });
                        } else if (!nTbody.querySelector('.btn-lock-cell') && !nTbody.querySelector('.sa-tr')) {
                            if (nCountEl) nCountEl.innerText = '0';
                            nTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">No neighbouring cells detected in the current sector.</td></tr>';
                        }
                    }
                } catch(e) {}
            });
        }, 1);

        return container;
    }
});
