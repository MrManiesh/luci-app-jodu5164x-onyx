#!/bin/sh
# jodu5164x-telnet-updater.sh
# Background daemon that refreshes the telnet-derived cache (thermal zones,
# CPU/RAM stats, nearby cells, cell lock status) every ~15s. This exists so
# the main dashboard data script (jodu5164x-data.sh) NEVER has to block on
# a slow telnet session itself - it just reads whatever this daemon last
# wrote to the cache files. Without this, a telnet fetch taking 15-28s could
# make fs.exec_direct() time out on the LuCI side ("exec_failed").

UCI_PKG="jodu5164x"
SYS_CACHE_FILE="/tmp/jodu5164x_sys_cache.raw"
SYS_TS_FILE="/tmp/jodu5164x_sys_ts"
SYS_STATUS_FILE="/tmp/jodu5164x_telnet_status"
REFRESH_INTERVAL=15

fetch_once() {
    ODU_HOST=$(uci -q get ${UCI_PKG}.main.host); [ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"
    TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port); [ -z "$TELNET_PORT" ] && TELNET_PORT="23"
    TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)
    TELNET_USER=$(uci -q get ${UCI_PKG}.main.telnet_username)
    ENABLED=$(uci -q get ${UCI_PKG}.main.enabled); [ -z "$ENABLED" ] && ENABLED="1"

    # monitoring paused - don't touch the ODU at all
    [ "$ENABLED" = "0" ] && return 0

    if ! command -v telnet >/dev/null 2>&1; then
        printf '%s' "no_client" > "$SYS_STATUS_FILE"
        return 0
    fi

    CMD="for z in /sys/class/thermal/thermal_zone*; do echo TZ:\$(basename \$z):\$(cat \$z/type 2>/dev/null):\$(cat \$z/temp 2>/dev/null); done; echo STAT1_BEGIN; cat /proc/stat; echo STAT1_END; sleep 1; echo STAT2_BEGIN; cat /proc/stat; echo STAT2_END; echo MEM:\$(awk '/^MemTotal:|^MemFree:|^MemAvailable:|^Buffers:|^Cached:|^SwapTotal:|^SwapFree:/{printf \"%s:\", \$2}' /proc/meminfo); echo LOADAVG:\$(cat /proc/loadavg); echo UPTIME:\$(cat /proc/uptime); echo CORES:\$(grep -c ^processor /proc/cpuinfo); MODEL_VAL=\$(cat /proc/device-tree/model 2>/dev/null | tr -d '\\0'); if [ -z \"\$MODEL_VAL\" ]; then MODEL_VAL=\$(grep -m1 Hardware /proc/cpuinfo | cut -d: -f2); fi; if [ -z \"\$MODEL_VAL\" ]; then MODEL_VAL=\$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2); fi; echo MODEL:\$MODEL_VAL; echo CONNTRACK:\$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null):\$(cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null); echo NEARBY_BEGIN; atcli 'AT+BNRCELLH=?'; echo NEARBY_END; echo LOCKCFG_BEGIN; cricli get_nr5g_cell_config; echo LOCKCFG_END"

    RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
    if command -v timeout >/dev/null 2>&1; then
        RUN="timeout 28 $RUN"
    fi

    OUT=$(
        {
            sleep 1
            if [ -n "$TELNET_USER" ]; then
                printf '%s\r\n' "$TELNET_USER"
                sleep 1
            fi
            if [ -n "$TELNET_PASS" ]; then
                printf '%s\r\n' "$TELNET_PASS"
                sleep 1
            fi
            printf '%s\r\n' "$CMD"
            sleep 10
            printf 'exit\r\n'
            sleep 1
        } | $RUN 2>&1
    )

    STATUS="ok"
    case "$OUT" in
        *"Connection refused"*|*"onnection refused"*) STATUS="unreachable" ;;
        *"No route to host"*|*"Network is unreachable"*) STATUS="unreachable" ;;
        *"onnection timed out"*|*"Connection timed out"*) STATUS="unreachable" ;;
        *"STAT1_BEGIN"*) STATUS="ok" ;;
        *) STATUS="auth_failed" ;;
    esac

    printf '%s' "$OUT" > "$SYS_CACHE_FILE"
    date +%s > "$SYS_TS_FILE"
    printf '%s' "$STATUS" > "$SYS_STATUS_FILE"
}

# Main loop - runs forever as a procd-managed background service.
while true; do
    fetch_once
    sleep "$REFRESH_INTERVAL"
done
