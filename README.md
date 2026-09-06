<div align="center">

# luci-app-jodu5164x-status

### Real-Time 5G Dashboard for ODU (JODU51641 / JODU51642) on OpenWrt

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/MrManiesh/luci-app-jodu5164x-status/releases)
[![OpenWrt](https://img.shields.io/badge/OpenWrt-23.05%20%7C%2024.10-success.svg)](https://openwrt.org)
[![ImmortalWrt](https://img.shields.io/badge/ImmortalWrt-Compatible-success.svg)](https://immortalwrt.org)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-orange.svg)](LICENSE)

A modern, feature-packed LuCI web dashboard extension designed specifically for **5G Outdoor Units (ODU)** (**JODU51641** and **JODU51642**).

</div>

---

> [!CAUTION]
> ### ⚠️ Development Notice & Disclaimer
> **This project is currently under active development toward a stable release.**
> 
> Features such as cell locking, rebooting, and diagnostic commands interact directly with your modem's internal CLI (`cricli` and `atcli`) over telnet. While commands are sent to volatile memory (`/tmp`) and do not modify persistent firmware partitions, **use this software at your own risk**. The developers are not responsible for connection drops, device misconfigurations, or service interruptions caused by third-party modems or network operators.

---

## 📖 About The Project

When using a 5G Outdoor Unit (CPE) connected directly to your OpenWrt router, checking your 5G signal quality, finding which tower you are connected to, or locking to a less congested carrier frequency usually requires opening telnet manually or accessing the restricted ODU interface.

**luci-app-jodu5164x-status** brings everything directly into your OpenWrt Web interface with an intuitive, dynamic dashboard, giving you complete visibility and control over your 5G connection.

---

## ✨ Features Explained

### 📡 Real-Time 5G Signal & Radio Metrics
- **Live Stats**: Continuously monitors **RSRP** (Signal Strength), **RSRQ** (Signal Quality), and **SINR** (Signal-to-Noise Ratio).
- **Overall Signal Score**: Calculates a consolidated signal quality percentage with dynamic 5-bar visualization.
- **Radio Parameters**: Shows Modulation (DL/UL QAM), MIMO layers (2x2 / 4x4), and Block Error Rate (BLER).

### 📏 Tower Distance Estimator (Timing Advance)
- Automatically converts 5G NR Timing Advance ($N_{TA}$) into an estimated physical distance to the serving gNodeB cell tower (e.g., `6 (~469 m to gNodeB)` or `0 (< 78 m · Line of Sight)`).
- Works with subcarrier spacing calculations for both **n78 (30 kHz)** and **n28 (15 kHz)** bands.

### 🎯 Outdoor Antenna Alignment / Aiming Mode (with Audio Beeper 🔊)
- Made specifically for when you take your phone up to the roof, terrace, or balcony to mount or aim your ODU antenna.
- **Sunlight-Readable View**: Oversized, high-contrast gauges for RSRP and SINR visible under direct sunlight.
- **Peak Value Tracking**: Keeps memory of the best RSRP and SINR recorded during your session (`Best: -76 dBm | Best: 24 dB`) so you can pinpoint the exact sweet-spot angle.
- **Live Acoustic Beeper**: Emits a periodic audio tone directly from your phone or laptop browser via the HTML5 Web Audio API. The pitch rises and the beep interval accelerates as signal peaks, allowing **100% hands-free** antenna alignment!

### ⚡ Carrier Aggregation (CA) & Band Details
- **Hero CA Badge**: Displays active carrier aggregation status right at the top (e.g., `2CA: n78 + n78 (200 MHz)` vs `1CA: n78 (100 MHz)`).
- **Friendly Band Names**: Identifies frequencies clearly (e.g., `n78 (3500 MHz · C-Band)`, `n28 (700 MHz · FDD Low-Band)`, `n258 (26 GHz · mmWave)`).
- **Dynamic Duplex Detection**: Identifies whether the active carrier is operating in **TDD** (Time Division) or **FDD** (Frequency Division).

### 🔒 Cell & Frequency Locking
- **Lock to Target Tower**: Lock the modem to a specific Physical Cell ID (PCI) and channel (NR-ARFCN) directly from the UI or neighbor list.
- **Carrier Frequency Lock**: Leave PCI empty to lock onto a carrier frequency (ARFCN) while letting the modem roam between sectors.
- **1-Click Auto Unlock**: Restore automatic carrier selection at any time.

### 🛰️ Cell Identity & Neighbouring Cells Tracking
- Extracts the 5G **Cell ID** (NCI) and **Tracking Area Code (TAC)**.
- Scans and lists all active secondary cells (SCells) and detected neighbouring towers in your sector with individual RSRP/RSRQ readings and instant 1-click lock buttons.

### 💻 Diagnostic Terminal with Quick-Action Chips
- Built-in terminal in the Settings modal that executes commands directly on the ODU over telnet.
- Includes 1-tap quick buttons for frequent diagnostic commands:
  - `cricli cell_location` — Tower location, TAC, Cell ID, and GPS coordinates
  - `AT+BNRINFO` — Primary 5G serving cell details
  - `AT+NRCAINFO` — Carrier aggregation & MIMO modulation matrix
  - `AT+BNRCELLH` — Neighbour cell measurement report
  - `cricli signal` — Low-level radio signal breakdown
  - `cricli wwan_stats` — WWAN interface packet and byte statistics
  - `cricli band` — Supported and active frequency bands
  - `cricli get_perso_info` — SIM card lock and profile status

### 📊 Session Data & Device Health
- Displays session download and upload data counters.
- Real-time ODU CPU usage percentage and internal thermal sensor temperature.
- ODU system uptime tracker.

---

## 🛠️ How It Works

```
┌──────────────────────────────────────┐
│       OpenWrt Router (LuCI)          │
│  - luci-app-jodu5164x-status WebUI     │
│  - jodu5164x-data.sh (Collector)     │
└──────────────────┬───────────────────┘
                   │
         Ethernet / LAN (IP: 192.168.225.1)
                   │
┌──────────────────▼───────────────────┐
│     ODU (JODU51641 / 51642)  │
│  - Telnet Provisioning on Port 23    │
│  - /tmp/odu_monitor.sh (in RAM)      │
│  - BusyBox httpd on Port 8080        │
└──────────────────────────────────────┘
```

1. **Zero Permanent Firmware Alterations**: Nothing is written to the ODU's flash memory. When provisioning, a lightweight collector script is placed in `/tmp` (RAM) and executed.
2. **Safe Local Communication**: The OpenWrt router queries the status endpoint over local HTTP (`:8080/status.txt`), avoiding repetitive telnet logins during regular monitoring.
3. **Automatic Re-provisioning**: If the ODU is rebooted or power-cycled, the app automatically detects the offline state and re-provisions the monitor service in the background.

---

## 📦 Compatibility & Requirements

| Component | Requirement |
|:---|:---|
| **Supported Modems** | ODU JODU51641, JODU51642 |
| **Router OS** | OpenWrt 23.05, OpenWrt 24.10, ImmortalWrt (all architectures) |
| **Package Managers** | Compatible with both modern APK (`apk add`) and legacy IPK (`opkg`) |
| **Dependencies** | `luci-base`, `wget`, `telnet-bsd`, `luci-compat` |

---

## 🚀 Installation

### Option 1: APK Package (OpenWrt 24.10+ / Alpine-based)
Download and install directly from your router's terminal:
```sh
wget --no-check-certificate -O /tmp/luci-app-jodu5164x-status.apk https://github.com/MrManiesh/luci-app-jodu5164x-status/releases/latest/download/luci-app-jodu5164x-status.apk
apk add --allow-untrusted /tmp/luci-app-jodu5164x-status.apk
```

### Option 2: IPK Package (OpenWrt 23.05 & older / opkg)
```sh
wget --no-check-certificate -O /tmp/luci-app-jodu5164x-status.ipk https://github.com/MrManiesh/luci-app-jodu5164x-status/releases/latest/download/luci-app-jodu5164x-status.ipk
opkg install /tmp/luci-app-jodu5164x-status.ipk
```

After installation, refresh your browser and navigate to:  
👉 **Status** $\rightarrow$ **5G Dashboard**

---

## ⚙️ Initial Configuration

By default, the package assumes the ODU is at the standard IP `192.168.225.1` with default telnet access.

If your network uses a different subnet or password:
1. Click the **Settings** button in the top right of the 5G Dashboard.
2. Switch to the **Config** tab.
3. Update the **ODU IP Address**, **Telnet Username**, or **Password**.
4. Click **Save & Apply**.

---

## ❓ Troubleshooting / FAQ

<details>
<summary><b>The dashboard shows "PROVISIONING..."</b></summary>
The router is establishing a telnet connection to the ODU to launch the background status service. This typically takes 15–25 seconds. Ensure the ODU is powered on and reachable at the configured IP address.
</details>

<details>
<summary><b>The dashboard shows "LINK DOWN"</b></summary>
The ODU is unreachable over Ethernet or has a different IP. Verify the physical cable between your OpenWrt router and the ODU PoE injector, and ensure you can ping the ODU IP (default <code>192.168.225.1</code>).
</details>

<details>
<summary><b>How do I unlock if I locked to a weak cell?</b></summary>
Click the <b>Clear Locks</b> button in the Neighbouring Cells header, or click <b>Manual Lock</b>, leave the fields blank, and confirm. The modem will return to automatic tower selection.
</details>

<details>
<summary><b>Does this work with other 5G modems or routers?</b></summary>
This package is specifically tailored for the JODU5164x series (JODU51641 / JODU51642) using Sercomm/Qualcomm internal CLI utilities (<code>cricli</code> / <code>atcli</code>). Modems from other manufacturers (ZTE, Huawei, Quectel) use different command interfaces.
</details>

---

## 📄 License & Credits

- **License**: Distributed under the [GNU General Public License v3.0](LICENSE).
- **Author**: Manish Matwa Choudhary
- **Project**: Personal OpenWrt development project for 5G CPE hardware.
