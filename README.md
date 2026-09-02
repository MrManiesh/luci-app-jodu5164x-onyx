<div align="center">

# luci-app-jodu5164x-onyx
## Made with Antigravity as a Personal Fun Project.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![OpenWrt Compatible](https://img.shields.io/badge/OpenWrt-Compatible-success.svg)
![ImmortalWrt Compatible](https://img.shields.io/badge/ImmortalWrt-Compatible-success.svg)

A LuCI dashboard extension for (JODU51641 / JODU51642).

This package provides a real-time ODU monitoring for OpenWrt. 
</div>

## Features
- **Real-Time Signal Monitoring:** Dynamically updates RSRP, RSRQ, SINR, and Signal Quality in real-time.
- **Data Usage Monitor:** Monitor the Data Usage directly on the Dashboard.
- **Neighbouring Cells Tracking:** See all active SCells and neighbouring cells in your sector.
- **Cell Locking:** Experimental feature to force the modem to lock onto a specific NR-ARFCN and PCI directly from the UI.

## Installation
Grab the Latest from the [Releases](https://github.com/MrManiesh/luci-app-jodu5164x-onyx/releases) page or directly install using:
```sh
wget --no-check-certificate -O /tmp/luci-app-jodu5164x-onyx.apk https://github.com/MrManiesh/luci-app-jodu5164x-onyx/releases/latest/download/luci-app-jodu5164x-onyx.apk && apk add --allow-untrusted /tmp/luci-app-jodu5164x-onyx.apk
```
   Go to **Status** -> **5G Dashboard** to view your stats!
