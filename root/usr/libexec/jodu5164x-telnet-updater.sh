#!/bin/sh
# =============================================================================
# jodu5164x-telnet-updater.sh
# Background Telemetry Daemon for Sercomm JODU5164x 5G ODUs
#
# Architecture & Purpose:
#   This daemon runs continuously in the background managed by procd
#   (/etc/init.d/jodu5164x-updater). It connects to the ODU via Telnet every
#   ~15s, executes low-level diagnostics, and writes the output to a raw cache
#   file (/tmp/jodu5164x_sys_cache.raw).
#
# Why a Background Daemon is Essential:
#   Telnet command execution over BusyBox on the ODU takes between 10–25s.
#   If the LuCI data collection script (jodu5164x-data.sh) performed Telnet
#   synchronously during web requests, browser polling would block, causing
#   OpenWrt's ubus/fs.exec_direct() RPC calls to time out ("exec_failed").
#   By decoupling Telnet I/O into this background daemon, the web UI script
#   reads the cache instantly in < 50ms with zero timeout risk.
#
# Telemetry Collected:
#   - 5G NR Serving Cell & Neighbouring Sector Cell Scan (AT+QENG, AT+BNRCELLH)
#   - 5G NR Cell Lock Configuration & State (cricli get_nr5g_cell_config)
#   - 5G NR Cell Location, TAC & Global Cell ID (cricli cell_location)
#   - Internal Thermal Sensor Zones (/sys/class/thermal/thermal_zone*)
#   - Dual CPU Stat Samples (/proc/stat ~1s apart for delta state calculations)
#   - Memory Breakdown (Total, Free, Available, Buffers, Cached, Swap)
#   - Load Averages, Uptime, Processor Cores, Hardware Model
#   - Active Network Connection Tracking (nf_conntrack count and max)
#
# Author: Manish Matwa Choudhary
# License: GPL-3.0
# =============================================================================

UCI_PKG="jodu5164x"
SYS_CACHE_FILE="/tmp/jodu5164x_sys_cache.raw"
SYS_TS_FILE="/tmp/jodu5164x_sys_ts"
SYS_STATUS_FILE="/tmp/jodu5164x_telnet_status"
REFRESH_INTERVAL=15

# -----------------------------------------------------------------------------
# Single Telemetry Collection Cycle
# -----------------------------------------------------------------------------
fetch_once() {
    ODU_HOST=$(uci -q get ${UCI_PKG}.main.host)
    [ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"

    TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port)
    [ -z "$TELNET_PORT" ] && TELNET_PORT="23"

    TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)

    ENABLED=$(uci -q get ${UCI_PKG}.main.enabled)
    [ -z "$ENABLED" ] && ENABLED="1"

    # If monitoring is paused, exit cleanly without touching the ODU
    [ "$ENABLED" = "0" ] && return 0

    # Ensure Telnet client is present
    if ! command -v telnet >/dev/null 2>&1; then
        printf '%s' "no_client" > "$SYS_STATUS_FILE"
        return 0
    fi

    # Protect against hung sessions using timeout command if available
    RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
    if command -v timeout >/dev/null 2>&1; then
        RUN="timeout 28 $RUN"
    fi

    # Check on-demand feature requirements and client activity
    NEED_FILE="/tmp/jodu5164x_needed_features"
    NOW=$(date +%s)
    NEED_NEARBY=1
    NEED_THERMAL=1
    NEED_CPU=1
    NEED_MEM=1
    NEED_SYS=1

    if [ -f "$NEED_FILE" ]; then
        . "$NEED_FILE" 2>/dev/null
        # If no UI poll has occurred in the past 90 seconds, user has closed or navigated away.
        # Idle to save CPU, network bandwidth, and ODU modem load.
        if [ -n "$TS" ] && [ $((NOW - TS)) -gt 90 ]; then
            return 0
        fi
        NEED_NEARBY="$NEARBY"
        NEED_THERMAL="$THERMAL"
        NEED_CPU="$CPU"
        NEED_MEM="$MEM"
        NEED_SYS="$SYS"

        # If all Telnet-dependent features are disabled, skip Telnet entirely
        if [ "$NEED_NEARBY" = "0" ] && [ "$NEED_THERMAL" = "0" ] && [ "$NEED_CPU" = "0" ] && [ "$NEED_MEM" = "0" ] && [ "$NEED_SYS" = "0" ]; then
            return 0
        fi
    fi

    # Execute Telnet interactive stream:
    # Commands are sent as individual printf lines to prevent Linux PTY buffer
    # truncation (which occurs when single piped commands exceed 1024 bytes).
    OUT=$(
        {
            sleep 1
            # Send password if configured
            if [ -n "$TELNET_PASS" ]; then
                printf '%s\r\n' "$TELNET_PASS"
                sleep 1
            fi

            # 1. Nearby Sector Cell Telemetry & Tower Lock (only when Nearby Cells is visible)
            if [ "$NEED_NEARBY" = "1" ]; then
                printf 'echo NEARBY_BEGIN\r\n'
                printf "atcli 'AT+QENG=\"servingcell\"'\r\n"
                printf "atcli 'AT+BNRCELLH=?'\r\n"
                printf 'echo NEARBY_END\r\n'

                printf 'echo LOCKCFG_BEGIN\r\n'
                printf 'cricli get_nr5g_cell_config\r\n'
                printf 'echo LOCKCFG_END\r\n'
            fi

            # 2. Cell Location & Tower Identifiers (TAC & Global Cell ID)
            printf 'echo LOC_BEGIN\r\n'
            printf 'cricli cell_location\r\n'
            printf 'echo LOC_END\r\n'

            # 3. Multi-Zone Thermal Telemetry (only when Thermal Sensors is visible)
            if [ "$NEED_THERMAL" = "1" ]; then
                printf 'for z in /sys/class/thermal/thermal_zone*; do echo TZ:$(basename $z):$(cat $z/type 2>/dev/null):$(cat $z/temp 2>/dev/null); done\r\n'
            fi

            # 4. CPU Delta State Sampling (2 samples ~1s apart, only when CPU widgets are visible)
            if [ "$NEED_CPU" = "1" ]; then
                printf 'echo STAT1_BEGIN; cat /proc/stat; echo STAT1_END\r\n'
                sleep 1
                printf 'echo STAT2_BEGIN; cat /proc/stat; echo STAT2_END\r\n'
            fi

            # 5. Memory Telemetry (only when Memory is visible)
            if [ "$NEED_MEM" = "1" ]; then
                printf "echo MEM:\$(awk '/^MemTotal:/{t=\$2} /^MemFree:/{f=\$2} /^MemAvailable:/{a=\$2} /^Buffers:/{b=\$2} /^Cached:/{c=\$2} /^SwapTotal:/{st=\$2} /^SwapFree:/{sf=\$2} END{printf \"%%s:%%s:%%s:%%s:%%s:%%s:%%s\", t, f, a, b, c, st, sf}' /proc/meminfo)\r\n"
            fi

            # 6. System Load, Uptime, Cores, Hardware Model, and Conntrack
            if [ "$NEED_SYS" = "1" ]; then
                printf 'echo LOADAVG:$(cat /proc/loadavg)\r\n'
                printf 'echo UPTIME:$(cat /proc/uptime)\r\n'
                printf 'echo CORES:$(grep -c ^processor /proc/cpuinfo)\r\n'
                printf "MODEL_VAL=\$(cat /proc/device-tree/model 2>/dev/null | tr -d '\\\\0'); [ -z \"\$MODEL_VAL\" ] && MODEL_VAL=\$(grep -m1 Hardware /proc/cpuinfo | cut -d: -f2); [ -z \"\$MODEL_VAL\" ] && MODEL_VAL=\$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2); echo MODEL:\$MODEL_VAL\r\n"
                printf 'echo CONNTRACK:$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null):$(cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null)\r\n'
            fi

            # Dynamic wait time: AT+BNRCELLH=? requires ~8s for modem channel scan;
            # without it, all other queries complete within 2-3s.
            if [ "$NEED_NEARBY" = "1" ]; then
                sleep 8
            else
                sleep 3
            fi
            printf 'exit\r\n'
            sleep 1
        } | $RUN 2>&1
    )

    # -------------------------------------------------------------------------
    # Analyze Telnet Response & Determine Health Status
    # -------------------------------------------------------------------------
    STATUS="ok"
    case "$OUT" in
        *"Connection refused"*|*"onnection refused"*)
            STATUS="unreachable" ;;
        *"No route to host"*|*"Network is unreachable"*)
            STATUS="unreachable" ;;
        *"onnection timed out"*|*"Connection timed out"*|*"timed out"*|*"Operation timed out"*)
            STATUS="unreachable" ;;
        *"STAT1_BEGIN"*|*"TZ:"*|*"NEARBY_BEGIN"*)
            STATUS="ok" ;;
        *"Login incorrect"*|*"login incorrect"*|*"Password:"*|*"login:"*|*"Login:"*)
            STATUS="auth_failed" ;;
        *)
            if [ -z "$OUT" ]; then
                STATUS="unreachable"
            else
                STATUS="auth_failed"
            fi
            ;;
    esac

    # -------------------------------------------------------------------------
    # Atomic Cache File Update
    # -------------------------------------------------------------------------
    # Write to temporary file first, then atomically rename to prevent readers
    # from seeing partially written files during active polling.
    if [ "$STATUS" = "ok" ]; then
        printf '%s' "$OUT" > "${SYS_CACHE_FILE}.tmp" && mv -f "${SYS_CACHE_FILE}.tmp" "$SYS_CACHE_FILE"
        date +%s > "$SYS_TS_FILE"
    fi

    # Record latest Telnet connectivity status
    printf '%s' "$STATUS" > "$SYS_STATUS_FILE"
}

# -----------------------------------------------------------------------------
# Main Service Loop
# -----------------------------------------------------------------------------
# Runs indefinitely under procd management.
while true; do
    fetch_once

    # Read user-configured poll interval from UCI
    INT=$(uci -q get ${UCI_PKG}.main.poll_interval)
    case "$INT" in
        [1-9]|10) REFRESH_INTERVAL="$INT" ;;
        *) REFRESH_INTERVAL=5 ;;
    esac
    [ "$REFRESH_INTERVAL" -lt 3 ] && REFRESH_INTERVAL=3

    sleep "$REFRESH_INTERVAL"
done
