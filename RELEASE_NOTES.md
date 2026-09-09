# Release v3.1.0 - Changed UI for Better

A clean visual overhaul inspired by industrial telecom equipment (Ubiquiti / Starlink) for a more professional and modern look.

## What's Changed
- **Cleaner Industrial Design**: Replaced consumer gradients and glowing effects with a sleek matte dark theme and sharp borders.
- **Sharp Vector Icons**: Replaced all emojis across the entire dashboard with clean, professional SVG icons.
- **Clear LED Signal Meter**: Upgraded the signal display to a crisp LED-style ladder for better readability.
- **Tabular Numbers**: Fixed metric numbers with tabular monospace fonts so values don't jitter during live updates.
- **Hardware Header**: Added a clean hardware model header (`SERCOMM JODU5164X`) with live telemetry indicator.
- **100% Feature Parity**: All features remain fully intact — RF metrics, Carrier Aggregation, Cell Locking, Cable Diagnostics, and Audio Aiming.

## Quick Install (OpenWrt 24.10+)
```sh
cd /tmp && uclient-fetch -O luci-app-jodu5164x-status-3.1.0-r1.apk https://github.com/MrManiesh/luci-app-jodu5164x-onyx/releases/download/v3.1.0/luci-app-jodu5164x-status-3.1.0-r1.apk && apk add --allow-untrusted ./luci-app-jodu5164x-status-*.apk
```

**Full Changelog**: https://github.com/MrManiesh/luci-app-jodu5164x-onyx/compare/v3.0.0...v3.1.0
