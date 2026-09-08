<div align="center">

# luci-app-jodu5164x-status

### Real-Time 5G Dashboard for Sercomm JODU5164x ODUs (JODU51641 / JODU51642) on OpenWrt

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/MrManiesh/luci-app-jodu5164x-status/releases)
[![OpenWrt](https://img.shields.io/badge/OpenWrt-23.05%20%7C%2024.10-success.svg)](https://openwrt.org)
[![ImmortalWrt](https://img.shields.io/badge/ImmortalWrt-Compatible-success.svg)](https://immortalwrt.org)
[![Original Author](https://img.shields.io/badge/Original%20Author-anishthevictorious-181717?style=flat&logo=github&logoColor=white)](https://github.com/anishthevictorious)
[![Telegram](https://img.shields.io/badge/Telegram-@Zeetron-2CA5E0?logo=telegram&logoColor=white)](https://t.me/Zeetron)

A modern, responsive LuCI web dashboard extension designed specifically for **Sercomm 5G Outdoor Units (ODU)** (**JODU51641** and **JODU51642**).

</div>

---

> [!CAUTION]
> ### ⚠️ Educational & Research Disclaimer
> **This software is developed strictly for educational, research, and personal hobbyist purposes.**
>
> Features such as cell locking, rebooting, and diagnostic queries interact with your modem's internal CLI (`cricli` and `atcli`) and native WebUI. While commands are sent in volatile memory and do not modify persistent firmware partitions, **use this software at your own risk**. The developers are not responsible for connection drops, device misconfigurations, or service interruptions caused by third-party modems or network operators.

---

## 📖 About The Project

When using a 5G Outdoor Unit (CPE) connected to your OpenWrt router, monitoring 5G signal quality, determining connected cell tower metrics, or locking to a less congested tower usually requires manual Telnet sessions or dealing with the ODU's single-login WebUI restrictions.

Originally created and conceptualized by **[Anish (@anishthevictorious)](https://github.com/anishthevictorious)**, This repository builds upon Anish's original work, introducing a new UI, customizable modular widgets, antenna aiming with Web Audio beeper feedback, and few other features.

---

## ✨ Features

### 📡 Real-Time 5G Radio & Signal Telemetry
- **Live Signal Metrics**: Real-time monitoring of **SS-RSRP** (Signal Strength), **SS-RSRQ** (Signal Quality), and **SS-SINR** (Signal-to-Noise Ratio).
- **Consolidated Signal Score**: Quality percentage gauge with clear coverage status (*Excellent*, *Good*, or *Weak*).
- **Full Radio Parameters**: Modulation (DL/UL QAM), MIMO layers (e.g. 4x4), DL Block Error Rate (**BLER %**), and NR-ARFCN channel.
- **Top Summary Cards**: Instant glance at Network Operator (PLMN), Signal Strength, Radio Purity, and Ethernet link speed.


### 🛰️ Cell Location & Tower Identifiers
- Automatically extracts and displays:
  - **Tracking Area Code (TAC)**: Formatted in both hexadecimal and decimal (e.g., `0xA8 (168)`).
  - **Global Cell ID (NCI)**: Formatted in both decimal and hexadecimal (e.g., `3439575040 (0xCD03C000)`) for easy lookup on platforms like CellMapper.
  - **Physical Cell ID (PCI)**: Real-time identification of your serving sector.

### ⚡ Carrier Aggregation (Secondary Cell) & Aggregate Bandwidth
- **Secondary Component Carrier (SCC)**: Full telemetry card for secondary carrier parameters when active (Band, Bandwidth, PCI, ARFCN, BLER, Modulation, MIMO, RSRP, RSRQ, SINR).
- **Dynamic Carrier State**: Displays a clean idle card when CA is inactive, and seamlessly switches to live secondary radio telemetry when engaged under load.
- **Aggregate Bandwidth Clarification**: Automatically computes total downlink bandwidth ($BW_{PCC} + BW_{SCC}$) and prominently displays:
  - **Secondary Cell Header Badge**: `⚡ Total: 200 MHz DL`
  - **Primary Cell Table**: `100 MHz (PCC) · Total: 200 MHz DL (2x CA)`
  - **Secondary Cell Table**: `Total: 200 MHz DL (100 MHz PCC + 100 MHz SCC)`
  - **Aiming Mode Modal**: Displays aggregate bandwidth status in real time.

### 🎯 Outdoor Antenna Alignment / Aiming Mode (with Web Audio Beeper 🔊)
- Specially designed for aiming and mounting your ODU antenna outdoors on a roof, terrace, or mast using a mobile phone or laptop:
  - **High-Contrast Sunlight UI**: Oversized RSRP and SINR indicators visible in bright direct sunlight.
  - **1-Second Real-Time Alignment Polling**: Automatically accelerates polling to 1-second intervals while aiming mode is open.
  - **Live Web Audio Beeper**: Emits pitch-modulated audio beeps directly through your browser via the HTML5 Web Audio API. As signal peaks, the audio pitch rises and the beep interval accelerates for **100% hands-free** antenna alignment!
  - **Peak Value & Delta Baseline Memory**: Tracks your session starting baseline and records peak RSRP and SINR values with live delta badges (`▲ +X dBm` / `▼ -X dBm`).
  - **Serving Cell Context**: Displays active Band, PCI, ARFCN
  - **Handover Detector**: Instant warning banner if the modem unexpectedly hops to a different PCI while rotating the antenna.

### 🔒 Cell & Frequency Locking
- **1-Click Tower Lock**: Lock directly to any detected tower from the Nearby Cells scan list.
- **Manual Cell Lock**: Input custom Physical Cell ID (PCI) and channel (NR-ARFCN) via the manual lock dialog.
- **1-Click Auto Unlock**: Remove locks at any time to return the modem to automatic cell selection.

### 📡 Nearby Cells & Sector Scan
- Lists detected neighbouring sector towers with PCI, ARFCN, RSRP, and RSRQ.
- Clearly flags the active `Serving (PCC)` and `Secondary (SCC)` cells.

### 📊 ODU Hardware & System Telemetry
- **Hardware Control**: 1-Click remote reboot of the 5G ODU with automatic reconnection monitoring.
- **Ethernet Diagnostics**: Real-time link status, duplex, negotiated speed, and Cat6/Gigabit cable recommendations for sub-gigabit links.
- **CPU & RAM Gauges**: Circular percentage gauges with 5-minute historical sparklines.
- **Detailed CPU Breakdown**: User space, System kernel, Idle, I/O wait, Hardware IRQ, Software IRQ, context switches/s, interrupt rate/s, and active connection tracking (`nf_conntrack`).
- **Internal Multi-Zone Thermal Sensors**: Multi-column temperature sensor grid covering CPU, 5G Modem, Sub-6 RF, Power Amplifiers, SDR transceivers, and ambient chassis, with a hottest-sensor alert badge.
- **Data Usage & Traffic Tracker**: Session upload and download counters, packet loss indicator, and rolling history windows (5 min, 1 hour, 5 hours, 24 hours).

### ⏸️ Monitoring Session Pause & Configuration
- **Single-Login Session Conflict Prevention**: Sercomm ODUs only allow one active WebUI login at a time. The dashboard includes a top-bar **`Monitoring: ON / OFF`** button to pause LuCI polling and release the session whenever you want to log into the native ODU WebUI.
- **Settings Modal**: Configure ODU IP address, WebUI credentials, Telnet port/password, polling interval (1s to 10s), and automated daily scheduled reboot.
- **CLI Diagnostics Tool**: Includes `/usr/libexec/jodu5164x-diag.sh <cmd>` for fast command-line diagnostics over SSH (`cell_location`, `signal`, `band`, `nearby`, etc.).

1. **Dual-Pipeline Telemetry**:
   - **Native WebUI HTTP API**: Queries the ODU's built-in web services using HMAC-SHA256 challenge-response session authentication for Primary/Secondary cell parameters, LAN status, and traffic data.
   - **Background Telnet Daemon**: Runs under `procd` on OpenWrt, polling low-level diagnostics (`atcli`, `cricli`, thermal zones, `/proc/stat`, `/proc/meminfo`) every ~15 seconds into an atomic RAM cache (`/tmp/jodu5164x_sys_cache.raw`).
2. **Sub-50ms Non-Blocking LuCI Execution**:
   - The LuCI data collector (`jodu5164x-data.sh`) reads the local background cache and active HTTP session instantaneously in < 50ms, avoiding browser timeouts (`exec_failed`).
3. **Zero Firmware Modifications**:
   - Absolutely nothing is modified or installed on the ODU firmware or persistent flash.

---

## 📦 Requirements & Compatibility

| Component | Requirement |
|:---|:---|
| **Supported Hardware** | Sercomm 5G ODU (JODU51641, JODU51642) |
| **Router OS** | OpenWrt 23.05, OpenWrt 24.10, ImmortalWrt (all CPU architectures) |
| **Package Format** | Compatible with both APK (`apk add`) and IPK (`opkg`) |
| **Dependencies** | `luci-base`, `curl`, `openssl-util`, `telnet-bsd`, `luci-compat` |

---

## 🚀 Installation

### Option 1: APK Package (OpenWrt 24.10+ / Alpine-based)
Install directly from your router's terminal:
```sh
wget --no-check-certificate -O /tmp/luci-app-jodu5164x-status.apk https://github.com/MrManiesh/luci-app-jodu5164x-status/releases/latest/download/luci-app-jodu5164x-status.apk
apk add --allow-untrusted /tmp/luci-app-jodu5164x-status.apk
```

### Option 2: IPK Package (OpenWrt 23.05 & older / opkg)
```sh
wget --no-check-certificate -O /tmp/luci-app-jodu5164x-status.ipk https://github.com/MrManiesh/luci-app-jodu5164x-status/releases/latest/download/luci-app-jodu5164x-status.ipk
opkg install /tmp/luci-app-jodu5164x-status.ipk
```

After installation, refresh your LuCI browser page and navigate to:  
👉 **Status** $\rightarrow$ **5G Dashboard**

---

## ⚙️ Configuration

By default, the package connects to the ODU at `192.168.225.1` with default WebUI credentials (`Admin`).

To configure your credentials or network settings:
1. Click the **⚙️ Settings** button at the top right of the 5G Dashboard.
2. Enter your **ODU IP Address**, **WebUI Password**, **Telnet Username** (if your device prompts for login first, e.g. `root`), and **Telnet Password**.
3. Choose your preferred **Telemetry Polling Rate** (1s to 10s, default 3s).
4. Optionally configure **Daily Scheduled Reboot** time.
5. Click **Save & Apply**.

---

## ❓ Troubleshooting / FAQ

<details>
<summary><b>The dashboard shows "ODU WebUI password is not configured"</b></summary>
Open the Settings modal on the dashboard and enter your ODU WebUI password. The password is required to query cellular metrics via the HMAC-SHA256 API.
</details>

<details>
<summary><b>The dashboard shows "Telnet Username Required" or "Telnet Authentication Failed"</b></summary>
Some ODU firmware variants prompt for a login username (e.g. <code>root</code> or <code>admin</code>) before password, whereas other variants prompt directly for a password.
<ul>
  <li><b>If your device asks for username first:</b> Open Settings and enter your username (usually <code>root</code>) in <b>Telnet Username</b>, along with your password.</li>
  <li><b>If your device directly asks for password:</b> Leave <b>Telnet Username</b> blank and only enter your <b>Telnet Password</b>.</li>
</ul>
</details>

<details>
<summary><b>The dashboard shows "Telnet is unreachable"</b></summary>
Verify that Telnet is enabled on your ODU and that your router can reach port 23 on the ODU IP.
</details>

<details>
<summary><b>I can't log into the native ODU WebUI from my browser</b></summary>
Sercomm ODUs restrict WebUI logins to a single concurrent session. Click the <b>Monitoring: ON</b> button at the top of the dashboard to pause polling and free the session. Once you finish using the native WebUI, click <b>Monitoring: OFF</b> to resume real-time dashboard updates.
</details>

<details>
<summary><b>How do I unlock if I locked to a weak cell?</b></summary>
Click the <b>🔓 Unlock</b> button next to the Lock State badge in the Nearby Cells section, or open <b>Manual Lock</b> and click Unlock.
</details>

<details>
<summary><b>Does this work with other 5G modems or routers?</b></summary>
This package is specifically tailored for Sercomm JODU5164x series ODUs (JODU51641 / JODU51642) utilizing Qualcomm/Sercomm internal diagnostic interfaces (<code>cricli</code> / <code>atcli</code>) and the Sercomm WebUI challenge protocol.
</details>

---

## ⚠️ Disclaimer & Takedown Notice

> **IMPORTANT**: This project is developed strictly for **educational, testing, research, and personal hobbyist purposes**. 
> It is an independent open-source community effort and is **not** affiliated with, endorsed by, sponsored by, or associated with any telecommunications carrier, service provider, or hardware manufacturer.
> 
> All trademarks, service marks, trade names, and product names referenced in this repository are the property of their respective owners.
> 
> **Notice to Rights Holders & Manufacturers**: If you believe that any file, parameter, documentation, or code snippet in this repository infringes upon proprietary rights, contains confidential material, or should not be publicly hosted, please **open a GitHub Issue or contact the maintainer directly via Telegram**:
>
> 📬 **Telegram**: [t.me/Zeetron](https://t.me/Zeetron) (`@Zeetron`)

---

## 👑 Original Author & Attribution

> [!NOTE]
> ### 🌟 Heartfelt Credit to the Original Creator
> Sincere credit, gratitude, and recognition go to **Anish** ([@anishthevictorious](https://github.com/anishthevictorious/))
> 
> **This repository is an evolved continuation built upon Anish's foundational work**, introducing:
> - **Redesigned New UI**: High-contrast, glanceable telemetry cards, glowing KPI ribbons, and dynamic responsive auto-fit grid.
> - **Modular Dynamic Widgets**: Toggable widgets with personalized dashboard layout persistence and on-demand resource querying.
> - **Outdoor Antenna Alignment Mode**: Real-time 1-second alignment polling with hands-free pitch-modulated Web Audio beeper.
> - **Advanced Cellular Insights**: 5G TAC & NCI formatting, and multi-band Carrier Aggregation (CA) aggregate bandwidth calculations.
> - **Performance Architecture**: Dedicated background caching daemon (`jodu5164x-updater`) running under `procd` ensuring instantaneous sub-50ms LuCI execution without browser timeout risks.

<div align="center">

| Role | Author | Links |
|:---|:---|:---|
| 🏛️ **Original Creator (Base Project)** | **Anish** | [![GitHub](https://img.shields.io/badge/GitHub-anishthevictorious-181717?style=flat&logo=github&logoColor=white)](https://github.com/anishthevictorious) [![Telegram](https://img.shields.io/badge/Telegram-@anish_iii-2CA5E0?style=flat&logo=telegram&logoColor=white)](https://t.me/anish_iii)  |
| 🎨 **UI Overhaul & Feature Additions** | **Manish Matwa Choudhary** | [![GitHub](https://img.shields.io/badge/GitHub-MrManiesh-181717?style=flat&logo=github&logoColor=white)](https://github.com/MrManiesh) [![Telegram](https://img.shields.io/badge/Telegram-@Zeetron-2CA5E0?style=flat&logo=telegram&logoColor=white)](https://t.me/Zeetron) |

</div>

---

## 📄 License & Maintainer

- **License**: Distributed under the [GNU General Public License v3.0](LICENSE).
- **Original Base Project**: Created by [Anish (@anishthevictorious)](https://github.com/anishthevictorious)
- **Current Maintainer**: Manish Matwa Choudhary ([@Zeetron](https://t.me/Zeetron) / [@MrManiesh](https://github.com/MrManiesh))
- **Project**: OpenWrt LuCI 5G CPE Dashboard.
