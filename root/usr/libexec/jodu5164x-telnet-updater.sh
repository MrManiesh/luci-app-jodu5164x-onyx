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
    ENABLED=$(uci -q get ${UCI_PKG}.main.enabled); [ -z "$ENABLED" ] && ENABLED="1"

    # monitoring paused - don't touch the ODU at all
    [ "$ENABLED" = "0" ] && return 0

    if ! command -v telnet >/dev/null 2>&1; then
        printf '%s' "no_client" > "$SYS_STATUS_FILE"
        return 0
    fi

    RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
    if command -v timeout >/dev/null 2>&1; then
        RUN="timeout 28 $RUN"
    fi

    OUT=$(
        {
            sleep 1
            if [ -n "$TELNET_PASS" ]; then
                printf '%s\r\n' "$TELNET_PASS"
                sleep 1
            fi
            printf 'echo NEARBY_BEGIN\r\n'
            printf "atcli 'AT+QENG=\"servingcell\"'\r\n"
            printf "atcli 'AT+BNRCELLH=?'\r\n"
            printf 'echo NEARBY_END\r\n'
            printf 'echo LOCKCFG_BEGIN\r\n'
            printf 'cricli get_nr5g_cell_config\r\n'
            printf 'echo LOCKCFG_END\r\n'
            printf 'for z in /sys/class/thermal/thermal_zone*; do echo TZ:\$(basename \$z):\$(cat \$z/type 2>/dev/null):\$(cat \$z/temp 2>/dev/null); done\r\n'
            printf 'echo STAT1_BEGIN; cat /proc/stat; echo STAT1_END\r\n'
            printf 'sleep 1\r\n'
            printf 'echo STAT2_BEGIN; cat /proc/stat; echo STAT2_END\r\n'
            printf "echo MEM:\$(awk '/^MemTotal:/{t=\$2} /^MemFree:/{f=\$2} /^MemAvailable:/{a=\$2} /^Buffers:/{b=\$2} /^Cached:/{c=\$2} /^SwapTotal:/{st=\$2} /^SwapFree:/{sf=\$2} END{printf \"%%s:%%s:%%s:%%s:%%s:%%s:%%s\", t, f, a, b, c, st, sf}' /proc/meminfo)\r\n"
            printf 'echo LOADAVG:\$(cat /proc/loadavg)\r\n'
            printf 'echo UPTIME:\$(cat /proc/uptime)\r\n'
            printf 'echo CORES:\$(grep -c ^processor /proc/cpuinfo)\r\n'
            printf "MODEL_VAL=\$(cat /proc/device-tree/model 2>/dev/null | tr -d '\\\\0'); [ -z \"\$MODEL_VAL\" ] && MODEL_VAL=\$(grep -m1 Hardware /proc/cpuinfo | cut -d: -f2); [ -z \"\$MODEL_VAL\" ] && MODEL_VAL=\$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2); echo MODEL:\$MODEL_VAL\r\n"
            printf 'echo CONNTRACK:\$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null):\$(cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null)\r\n'
            sleep 8
            printf 'exit\r\n'
            sleep 1
        } | $RUN 2>&1
    )

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

    # Only replace cache if the output is valid to prevent transient glitches from zeroing telemetry
    if [ "$STATUS" = "ok" ]; then
        printf '%s' "$OUT" > "${SYS_CACHE_FILE}.tmp" && mv -f "${SYS_CACHE_FILE}.tmp" "$SYS_CACHE_FILE"
        date +%s > "$SYS_TS_FILE"
    fi

    printf '%s' "$STATUS" > "$SYS_STATUS_FILE"
}

# Main loop - runs forever as a procd-managed background service.
while true; do
    fetch_once
    INT=$(uci -q get ${UCI_PKG}.main.poll_interval)
    case "$INT" in
        [1-9]|10) REFRESH_INTERVAL="$INT" ;;
        *) REFRESH_INTERVAL=5 ;;
    esac
    [ "$REFRESH_INTERVAL" -lt 3 ] && REFRESH_INTERVAL=3
    sleep "$REFRESH_INTERVAL"
done
