# Release v3.5.0 - Dedicated "Onyx Tools" Menu & Universal Theme-Adaptive UI

This release introduces a dedicated top-level **Onyx Tools** navigation category in LuCI, renames the status view to **5G ODU Telemetry**, and incorporates the complete **Universal Theme-Adaptive Engine** for seamless dark and light theme switching across all router themes.

## What's Changed in v3.5.0

### 🛠️ Dedicated "Onyx Tools" Top-Level Navigation
- **New Main Navigation Category**: Added a dedicated **Onyx Tools** category to LuCI's top navigation bar alongside Status, Network, and System.
- **5G ODU Telemetry Naming**: Renamed the dashboard view from "5G Dashboard" to **5G ODU Telemetry** for clear, professional telecom identification.
- **Direct 1-Click Access**: Configured with `firstchild` routing so clicking **Onyx Tools** in the top bar automatically opens the telemetry dashboard.
- **Unified Ecosystem Foundation**: Establishes a consolidated home for the Onyx suite of router utilities (such as 5G ODU Telemetry and Speedtest Onyx).

---

## Included from v3.2.1: Universal Theme Adaptation & Fixes

### 🎨 Universal Theme-Adaptive Design System
- **Automatic 3-Tier Theme Detection**: Detects active router themes dynamically via HTML/body attributes, loaded stylesheet analysis (`/material`, `/bootstrap`, `argon`, etc.), computed element luminance, and `prefers-color-scheme` media queries.
- **Seamless Light & Dark Rendering**: Automatically toggles between deep obsidian cards with bright text in dark themes and clean white cards with crisp slate borders (`#cbd5e1`) and high-contrast typography (`#0f172a`) in light themes.
- **Fixed Initial Black Cards on Light Themes**: Eliminated the race condition where cards initially loaded black on light themes (such as Material or Bootstrap) until opening the Settings modal. Theme detection now runs prior to DOM instantiation, attaching `.theme-light` on the very first frame.
- **Dynamic Quality Colors**: Radio quality meters, badges, and signal scores dynamically adjust their palette contrast based on the active theme for optimal readability.
- **Theme-Adaptive Modals**: Settings, Aiming Mode, and Widget Customization dialogs now seamlessly match the active router theme.

---

## Quick Install (OpenWrt 24.10+ / ImmortalWrt)
```sh
cd /tmp && uclient-fetch -O luci-app-jodu5164x-status-3.5.0-r1.apk https://github.com/MrManiesh/luci-app-jodu5164x-onyx/releases/download/v3.5.0/luci-app-jodu5164x-status-3.5.0-r1.apk && apk add --allow-untrusted ./luci-app-jodu5164x-status-*.apk
```

### Where to Find in LuCI After Installation:
> 👉 **Onyx Tools** $\rightarrow$ **5G ODU Telemetry**

**Full Changelog**: https://github.com/MrManiesh/luci-app-jodu5164x-onyx/compare/v3.1.0...v3.5.0
