# Release v3.2.1 - Universal Theme-Adaptive UI & Light Theme Rendering

This release brings seamless **Universal Theme Adaptation** across all OpenWrt / ImmortalWrt themes (LuCI Material, Bootstrap Light/Dark, Argon, Proton2025, Aurora, Design, etc.) with automatic color palette switching and zero black-card glitches on light themes.

## What's Changed
- **Universal Theme-Adaptive Engine**: 
  - Dynamic 3-tier theme detection utilizing DOM theme attributes, loaded stylesheets (`/material`, `/bootstrap`, `argon`, etc.), computed element luminance, and `prefers-color-scheme` media queries.
  - Automatically switches between crisp obsidian cards with high contrast in dark mode and clean white cards with visible slate borders (`#cbd5e1`) and deep slate typography (`#0f172a`) in light mode.
- **Fixed Initial Black Cards Glitch**:
  - Eliminated the race condition where `#app-root` rendered with dark styles on light themes before opening the Settings modal.
  - Evaluates theme detection prior to DOM element construction and instantiates `#app-root` with the correct theme class (`theme-light` or `theme-dark`) on the very first frame.
  - Applied direct element targeting in `ThemeEngine.apply(targetEl)` so detached in-memory elements receive their classes immediately.
  - Aligned default fallback CSS design tokens to clean light theme values matching standard LuCI themes.
- **Dynamic Quality Colors**:
  - Quality badges, meters, and RF signals dynamically calculate their color contrast palette based on the active theme so text remains crystal clear and readable in both dark and light modes.
- **Theme-Adaptive Modals & Popups**:
  - Wrapped settings, aiming mode, and widget customization dialogs in `.jodu-theme-scope` to blend seamlessly with the active router theme.

## Quick Install (OpenWrt 24.10+ / ImmortalWrt)
```sh
cd /tmp && uclient-fetch -O luci-app-jodu5164x-status-3.2.1-r1.apk https://github.com/MrManiesh/luci-app-jodu5164x-onyx/releases/download/v3.2.1/luci-app-jodu5164x-status-3.2.1-r1.apk && apk add --allow-untrusted ./luci-app-jodu5164x-status-*.apk
```

**Full Changelog**: https://github.com/MrManiesh/luci-app-jodu5164x-onyx/compare/v3.1.0...v3.2.1
