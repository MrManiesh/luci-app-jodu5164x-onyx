#!/bin/sh
# jodu5164x-data.sh
# Collector for JODU51641/JODU51642 (Jio WebUI/API based ODU).
# Config (host/username/password/telnet password) comes from UCI
# (/etc/config/jodu5164x) so it can be edited from the LuCI Settings page.
#
# Logs in via HMAC-SHA256 challenge (session cookie cached & reused across
# polls; auto re-login if the session has expired), fetches primary +
# secondary cell JSON + LAN/eth JSON, then reads background telnet cache
# for thermal zones, CPU/RAM telemetry, nearby cells, and lock status,
# emitting one flat status JSON for the LuCI dashboard.

UCI_PKG="jodu5164x"
ODU_HOST=$(uci -q get ${UCI_PKG}.main.host); [ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"
ODU_USER=$(uci -q get ${UCI_PKG}.main.username); [ -z "$ODU_USER" ] && ODU_USER="Admin"
ODU_PASS=$(uci -q get ${UCI_PKG}.main.password)
TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port); [ -z "$TELNET_PORT" ] && TELNET_PORT="23"
TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)
ENABLED=$(uci -q get ${UCI_PKG}.main.enabled); [ -z "$ENABLED" ] && ENABLED="1"

# Monitoring paused: don't touch the ODU at all (no login, no session held)
# so its own WebUI login isn't blocked by us.
if [ "$ENABLED" = "0" ]; then
    echo '{"server_link":"DISABLED"}'
    exit 0
fi

ENC_KEY='$1$SERCOMM$'
COOKIE_JAR="/tmp/jodu5164x_cookie.txt"
TIMEOUT=5

# ---- helpers ----

# extract a "key":"value" string or numeric field from a flat JSON blob
get_val() {
    # $1 = key, $2 = json text
    printf '%s' "$2" | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\?\([^",}]*\)"\?.*/\1/p'
}

# strip trailing unit text ("dBm"/"dB") leaving just the number
strip_unit() {
    printf '%s' "$1" | sed -E 's/[[:space:]]*(dBm|dB)$//'
}

# JSON-escape a string: backslash and double-quote
json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

WEBUI_STATUS="ok"

# The background daemon (jodu5164x-telnet-updater.sh, a procd service)
# refreshes these cache files every ~15s. This script only ever READS them
# - it never telnets itself - so it can never block/time out on that.
SYS_CACHE_FILE="/tmp/jodu5164x_sys_cache.raw"
SYS_TS_FILE="/tmp/jodu5164x_sys_ts"
SYS_STATUS_FILE="/tmp/jodu5164x_telnet_status"

TELNET_STATUS=$(cat "$SYS_STATUS_FILE" 2>/dev/null)
[ -z "$TELNET_STATUS" ] && TELNET_STATUS="ok"

read_sys_cache() {
    [ -s "$SYS_CACHE_FILE" ] && cat "$SYS_CACHE_FILE"
}

# Builds the friendly diagnostic message shown on the dashboard when the
# WebUI login fails, based on WEBUI_STATUS.
emit_offline_diagnosis() {
    case "$WEBUI_STATUS" in
        no_password)
            webui_msg="ODU WebUI password is not configured. Click Settings to enter your password." ;;
        ip_unreachable)
            webui_msg="Can't reach the ODU WebUI at ${ODU_HOST}. Check the IP Address in Settings." ;;
        wrong_password)
            webui_msg="ODU WebUI login failed. Check the WebUI Password in Settings." ;;
        fetch_failed)
            webui_msg="Connected to ODU but could not fetch cell parameters. Check device state." ;;
        *)
            webui_msg="Could not reach the ODU WebUI." ;;
    esac

    case "$TELNET_STATUS" in
        unreachable)
            telnet_msg="Telnet is unreachable. Enable Telnet on the ODU, or check the IP/Port in Settings." ;;
        auth_failed)
            telnet_msg="Telnet connected but login failed. Check the Telnet Password in Settings." ;;
        no_client)
            telnet_msg="Telnet client is missing on the router." ;;
        *)
            telnet_msg="" ;;
    esac

    webui_msg_esc=$(json_escape "$webui_msg")
    telnet_msg_esc=$(json_escape "$telnet_msg")

    echo "{\"server_link\":\"OFFLINE\",\"webui_status\":\"${WEBUI_STATUS}\",\"webui_message\":\"${webui_msg_esc}\",\"telnet_status\":\"${TELNET_STATUS}\",\"telnet_message\":\"${telnet_msg_esc}\"}"
}

# If password has not been configured in UCI, alert user immediately
if [ -z "$ODU_PASS" ]; then
    WEBUI_STATUS="no_password"
    emit_offline_diagnosis
    exit 1
fi

do_login() {
    HASH1=$(printf '%s' "$ODU_PASS" | openssl dgst -sha256 -hmac "$ENC_KEY" | sed 's/^.* //')
    HASH2=$(printf '%s' "$HASH1" | openssl dgst -sha256 -hmac "$ENC_KEY" | sed 's/^.* //')
    LOGIN_PWD=$(printf '%s' "$HASH2" | openssl base64 -A)

    rm -f "$COOKIE_JAR"
    CODE=$(curl -sk -o /dev/null -w '%{http_code}' \
        --connect-timeout "$TIMEOUT" \
        -c "$COOKIE_JAR" \
        -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
        -H 'X-Requested-With: XMLHttpRequest' \
        --data "LoginName=${ODU_USER}&LoginPWD=${LOGIN_PWD}&remember_pwd=0" \
        "https://${ODU_HOST}/data/login.json?_=$(date +%s%3N)")

    # curl reports http_code "000" when it couldn't connect at all (wrong IP,
    # ODU offline, wrong port, etc) - distinct from a reachable-but-rejected login.
    if [ "$CODE" = "000" ]; then
        WEBUI_STATUS="ip_unreachable"
        return 1
    fi

    if [ "$CODE" != "200" ] || ! grep -qi QSESSIONID "$COOKIE_JAR" 2>/dev/null; then
        WEBUI_STATUS="wrong_password"
        return 1
    fi

    WEBUI_STATUS="ok"
    return 0
}

fetch_cell_json() {
    # $1 = filename (network_status_cell_parameters.json / secondary variant)
    curl -sk --connect-timeout "$TIMEOUT" -b "$COOKIE_JAR" \
        "https://${ODU_HOST}/data/${1}?_=$(date +%s%3N)"
}

# Extracts one STAT<n>_BEGIN..STAT<n>_END block from the cleaned raw dump,
# returning "cpuline|ctxt|intr|procs_running".
extract_stat_block() {
    raw="$1"; marker="$2"
    printf '%s\n' "$raw" | awk -v m="$marker" '
        $0 == m"_BEGIN" { inblk=1; next }
        $0 == m"_END"   { inblk=0 }
        inblk && /^cpu / { cpuline=$0 }
        inblk && /^ctxt/ { ctxt=$2 }
        inblk && /^intr/ { intr=$2 }
        inblk && /^procs_running/ { running=$2 }
        END {
            sub(/^cpu[[:space:]]*/, "", cpuline);
            printf "%s|%s|%s|%s", cpuline, ctxt+0, intr+0, running+0
        }'
}

# Computes per-state CPU percentages (user/nice/system/idle/iowait/irq/
# softirq/steal) from two /proc/stat "cpu" line samples ~1s apart.
compute_cpu_states() {
    c1="$1"; c2="$2"
    if [ -z "$c1" ] || [ -z "$c2" ]; then
        printf '::::::::'
        return
    fi
    awk -v c1="$c1" -v c2="$c2" 'BEGIN {
        split(c1, a, " "); split(c2, b, " ");
        t1 = 0; t2 = 0;
        for (i = 1; i <= 8; i++) { t1 += a[i]+0; t2 += b[i]+0; }
        dt = t2 - t1;
        if (dt <= 0) { printf "::::::::"; exit; }
        printf "%.1f:%.1f:%.1f:%.1f:%.1f:%.1f:%.1f:%.1f",
            100*(b[1]-a[1])/dt, 100*(b[2]-a[2])/dt, 100*(b[3]-a[3])/dt,
            100*(b[4]-a[4])/dt, 100*(b[5]-a[5])/dt, 100*(b[6]-a[6])/dt,
            100*(b[7]-a[7])/dt, 100*(b[8]-a[8])/dt;
    }'
}

# Parses "MEM:<Total>:<Free>:<Avail>:<Buffers>:<Cached>:<SwapTotal>:<SwapFree>"
# (KB) into total/used/pct plus the individual breakdown figures.
compute_mem_stats() {
    raw="$1"
    line=$(printf '%s' "$raw" | sed -n 's/^MEM://p')
    [ -z "$line" ] && { printf ':::::::'; return; }

    total=$(printf '%s' "$line" | cut -d: -f1)
    free=$(printf '%s' "$line" | cut -d: -f2)
    avail=$(printf '%s' "$line" | cut -d: -f3)
    buffers=$(printf '%s' "$line" | cut -d: -f4)
    cached=$(printf '%s' "$line" | cut -d: -f5)
    swap_total=$(printf '%s' "$line" | cut -d: -f6)
    swap_free=$(printf '%s' "$line" | cut -d: -f7)

    case "$total" in ''|*[!0-9]*) printf ':::::::'; return ;; esac
    if [ -z "$avail" ] || ! [ "$avail" -ge 0 ] 2>/dev/null; then
        avail=$((free + buffers + cached))
    fi
    used=$((total - avail))
    pct=$(awk -v u="$used" -v t="$total" 'BEGIN { if (t > 0) printf "%.1f", 100*u/t; else printf ""; }')

    case "$swap_total" in ''|*[!0-9]*) swap_total=0 ;; esac
    case "$swap_free" in ''|*[!0-9]*) swap_free=0 ;; esac
    swap_used=$((swap_total - swap_free))
    [ "$swap_used" -lt 0 ] && swap_used=0

    printf '%s:%s:%s:%s:%s:%s:%s' "$total" "$used" "$pct" "$free" "$cached" "$buffers" "$swap_total"
    printf ':%s' "$swap_used"
}

# Parses "TZ:<zone>:<type>:<temp_milli>" lines into a JSON array.
build_thermal_json() {
    raw="$1"
    result="[]"
    if [ -n "$raw" ]; then
        entries=""
        old_ifs="$IFS"
        IFS='
'
        for line in $raw; do
            case "$line" in
                TZ:*)
                    zone=$(printf '%s' "$line" | cut -d: -f2)
                    type=$(printf '%s' "$line" | cut -d: -f3)
                    temp_milli=$(printf '%s' "$line" | cut -d: -f4 | tr -d '\r')
                    case "$temp_milli" in
                        ''|*[!0-9-]*) continue ;;
                    esac
                    temp_c=$(awk -v t="$temp_milli" 'BEGIN { printf "%.1f", t/1000 }')
                    zone_esc=$(json_escape "$zone")
                    type_esc=$(json_escape "$type")
                    entry="{\"zone\":\"${zone_esc}\",\"type\":\"${type_esc}\",\"temp_c\":\"${temp_c}\"}"
                    if [ -z "$entries" ]; then
                        entries="$entry"
                    else
                        entries="${entries},${entry}"
                    fi
                    ;;
            esac
        done
        IFS="$old_ifs"
        [ -n "$entries" ] && result="[${entries}]"
    fi
    printf '%s' "$result"
}

# Generic BEGIN/END block extractor (returns the raw lines in between).
extract_block_lines() {
    raw="$1"; marker="$2"
    printf '%s\n' "$raw" | awk -v m="$marker" '
        $0 == m"_BEGIN" { inblk=1; next }
        $0 == m"_END"   { inblk=0; next }
        inblk { print }
    '
}

# Parses "AT+BNRCELLH=?" output lines ("<idx> <ARFCN> <PCI> <RSRP> <RSRQ>")
# into a JSON array, skipping unused/empty history slots (ARFCN=0, PCI=0).
build_nearby_cells_json() {
    raw="$1"
    printf '%s\n' "$raw" | awk '
        BEGIN { printf "["; first=1 }
        NF==5 && $1 ~ /^[0-9]+$/ && $2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/ {
            arfcn=$2; pci=$3; rsrp=$4; rsrq=$5
            sub(/\r$/, "", rsrq)
            if (arfcn == "0" && pci == "0") next
            rsrp_val = sprintf("%.0f", rsrp + 0)
            rsrq_val = sprintf("%.0f", rsrq + 0)
            key = pci "_" arfcn
            if (!(key in seen)) {
                seen[key] = 1
                if (!first) printf ","
                printf "{\"pci\":\"%s\",\"arfcn\":\"%s\",\"rsrp\":\"%s\",\"rsrq\":\"%s\"}", pci, arfcn, rsrp_val, rsrq_val
                first = 0
            }
            next
        }
        {
            line = $0
            gsub(/[,:]/, " ", line)
            n = split(line, f)
            for (i = 1; i <= n - 4; i++) {
                if (f[i] ~ /^[0-9]+$/ && f[i+1] ~ /^[0-9]+$/ && f[i+2] ~ /^[0-9]+$/) {
                    arfcn = f[i+1]; pci = f[i+2]; rsrp = f[i+3]; rsrq = f[i+4]
                    sub(/\r$/, "", rsrq)
                    if (arfcn == "0" && pci == "0") next
                    rsrp_val = sprintf("%.0f", rsrp + 0)
                    rsrq_val = sprintf("%.0f", rsrq + 0)
                    key = pci "_" arfcn
                    if (!(key in seen)) {
                        seen[key] = 1
                        if (!first) printf ","
                        printf "{\"pci\":\"%s\",\"arfcn\":\"%s\",\"rsrp\":\"%s\",\"rsrq\":\"%s\"}", pci, arfcn, rsrp_val, rsrq_val
                        first = 0
                    }
                    next
                }
            }
        }
        END { printf "]" }
    '
}

# Extracts the current NR5G cell lock status text (e.g. "UNLOCK").
extract_lock_status() {
    raw="$1"
    status=$(printf '%s\n' "$raw" | sed -n 's/^NR5G cell config type: *//p' | head -1 | tr -d '\r')
    [ -z "$status" ] && status="UNKNOWN"
    printf '%s' "$status"
}

# ---- Step 1: try existing cached session first ----
if [ ! -s "$COOKIE_JAR" ]; then
    do_login || { emit_offline_diagnosis; exit 1; }
fi

PRIMARY=$(fetch_cell_json "network_status_cell_parameters.json")

# if session expired/invalid, response will typically be empty or an error page
if [ -z "$PRIMARY" ] || ! printf '%s' "$PRIMARY" | grep -qE '"signal_strength"|"operating_mode"|"band"|"nr_earcn"'; then
    do_login || { emit_offline_diagnosis; exit 1; }
    PRIMARY=$(fetch_cell_json "network_status_cell_parameters.json")
fi

if [ -z "$PRIMARY" ]; then
    WEBUI_STATUS="fetch_failed"
    emit_offline_diagnosis
    exit 1
fi

SECONDARY=$(fetch_cell_json "network_status_secondary_cell_parameters.json")
LAN=$(fetch_cell_json "network_status_lan.json")
DEVICE_DATA=$(fetch_cell_json "network_status_device_data.json")

SYS_RAW=$(read_sys_cache)
SYS_RAW=$(printf '%s' "$SYS_RAW" | tr -d '\r')
THERMAL_JSON=$(build_thermal_json "$SYS_RAW")

NEARBY_RAW=$(extract_block_lines "$SYS_RAW" "NEARBY")
NEARBY_CELLS_JSON=$(build_nearby_cells_json "$NEARBY_RAW")

LOCKCFG_RAW=$(extract_block_lines "$SYS_RAW" "LOCKCFG")
CELL_LOCK_STATUS=$(extract_lock_status "$LOCKCFG_RAW")
CELL_LOCK_STATUS_ESC=$(json_escape "$CELL_LOCK_STATUS")

S1=$(extract_stat_block "$SYS_RAW" "STAT1")
S2=$(extract_stat_block "$SYS_RAW" "STAT2")
CPU1_LINE=$(printf '%s' "$S1" | cut -d'|' -f1)
CPU2_LINE=$(printf '%s' "$S2" | cut -d'|' -f1)
CTXT1=$(printf '%s' "$S1" | cut -d'|' -f2)
CTXT2=$(printf '%s' "$S2" | cut -d'|' -f2)
INTR1=$(printf '%s' "$S1" | cut -d'|' -f3)
INTR2=$(printf '%s' "$S2" | cut -d'|' -f3)
PROCS_RUNNING=$(printf '%s' "$S2" | cut -d'|' -f4)

CPU_STATES=$(compute_cpu_states "$CPU1_LINE" "$CPU2_LINE")
PCT_USER=$(printf '%s' "$CPU_STATES" | cut -d: -f1)
PCT_NICE=$(printf '%s' "$CPU_STATES" | cut -d: -f2)
PCT_SYSTEM=$(printf '%s' "$CPU_STATES" | cut -d: -f3)
PCT_IDLE=$(printf '%s' "$CPU_STATES" | cut -d: -f4)
PCT_IOWAIT=$(printf '%s' "$CPU_STATES" | cut -d: -f5)
PCT_IRQ=$(printf '%s' "$CPU_STATES" | cut -d: -f6)
PCT_SOFTIRQ=$(printf '%s' "$CPU_STATES" | cut -d: -f7)
PCT_STEAL=$(printf '%s' "$CPU_STATES" | cut -d: -f8)
CPU_PCT=$(awk -v idle="$PCT_IDLE" 'BEGIN { if (idle == "") { print ""; } else { printf "%.1f", 100 - idle; } }')

CTXT_RATE=$(awk -v a="$CTXT1" -v b="$CTXT2" 'BEGIN { d=b-a; if (d<0) d=0; printf "%d", d }')
INTR_RATE=$(awk -v a="$INTR1" -v b="$INTR2" 'BEGIN { d=b-a; if (d<0) d=0; printf "%d", d }')

MEM_STATS=$(compute_mem_stats "$SYS_RAW")
MEM_TOTAL_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f1)
MEM_USED_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f2)
MEM_PCT=$(printf '%s' "$MEM_STATS" | cut -d: -f3)
MEM_FREE_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f4)
MEM_CACHED_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f5)
MEM_BUFFERS_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f6)
MEM_SWAP_TOTAL_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f7)
MEM_SWAP_USED_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f8)

LOAD_RAW=$(printf '%s' "$SYS_RAW" | sed -n 's/^LOADAVG://p')
LOAD1=$(printf '%s' "$LOAD_RAW" | awk '{print $1}')
LOAD5=$(printf '%s' "$LOAD_RAW" | awk '{print $2}')
LOAD15=$(printf '%s' "$LOAD_RAW" | awk '{print $3}')
TASKS_RAW=$(printf '%s' "$LOAD_RAW" | awk '{print $4}')
TASKS_RUNNING=$(printf '%s' "$TASKS_RAW" | cut -d/ -f1)
TASKS_TOTAL=$(printf '%s' "$TASKS_RAW" | cut -d/ -f2)

UPTIME_RAW=$(printf '%s' "$SYS_RAW" | sed -n 's/^UPTIME://p')
UPTIME_SEC=$(printf '%s' "$UPTIME_RAW" | awk '{printf "%d", $1}')

CORES=$(printf '%s' "$SYS_RAW" | sed -n 's/^CORES://p')
CPU_MODEL=$(printf '%s' "$SYS_RAW" | sed -n 's/^MODEL:[[:space:]]*//p' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

CONNTRACK_RAW=$(printf '%s' "$SYS_RAW" | sed -n 's/^CONNTRACK://p')
CONNTRACK_COUNT=$(printf '%s' "$CONNTRACK_RAW" | cut -d: -f1)
CONNTRACK_MAX=$(printf '%s' "$CONNTRACK_RAW" | cut -d: -f2)

for v in CPU_PCT PCT_USER PCT_NICE PCT_SYSTEM PCT_IDLE PCT_IOWAIT PCT_IRQ PCT_SOFTIRQ PCT_STEAL \
         MEM_TOTAL_KB MEM_USED_KB MEM_PCT MEM_FREE_KB MEM_CACHED_KB MEM_BUFFERS_KB MEM_SWAP_TOTAL_KB MEM_SWAP_USED_KB \
         LOAD1 LOAD5 LOAD15 TASKS_RUNNING TASKS_TOTAL UPTIME_SEC CORES CTXT_RATE INTR_RATE CONNTRACK_COUNT CONNTRACK_MAX; do
    eval "val=\$$v"
    [ -z "$val" ] && eval "$v=--"
done
[ -z "$CPU_MODEL" ] && CPU_MODEL="Unknown"
CPU_MODEL_ESC=$(json_escape "$CPU_MODEL")

# ---- Step 2: extract cellular/eth fields ----
OPERATING_MODE=$(get_val "operating_mode" "$PRIMARY")

SIM_STATUS="ok"
OM_LOWER=$(printf '%s' "$OPERATING_MODE" | tr 'A-Z' 'a-z')
if [ -z "$OPERATING_MODE" ] || [ "$OM_LOWER" = "na" ]; then
    SIM_STATUS="missing"
fi
BAND=$(get_val "band" "$PRIMARY")
BANDWIDTH=$(get_val "bandwidth" "$PRIMARY")
ARFCN=$(get_val "nr_earcn" "$PRIMARY")
PCI=$(get_val "physical_cell_id" "$PRIMARY")
PLMN=$(get_val "plmn" "$PRIMARY")
RRC_STATE=$(get_val "rrc_state" "$PRIMARY")
BLER=$(get_val "dl_bler" "$PRIMARY")
MIMO=$(get_val "mimo" "$PRIMARY")
MODULATION=$(get_val "modulation" "$PRIMARY")
CQI=$(get_val "cqi" "$PRIMARY")
RSRP=$(strip_unit "$(get_val "ss_rsrp" "$PRIMARY")")
RSRQ=$(strip_unit "$(get_val "ss_rsrq" "$PRIMARY")")
SINR=$(strip_unit "$(get_val "ss_sinr" "$PRIMARY")")

SCC_BAND=$(get_val "band" "$SECONDARY")
SCC_BW=$(get_val "bandwidth" "$SECONDARY")
SCC_ARFCN=$(get_val "nr_earcn" "$SECONDARY")
SCC_PCI=$(get_val "physical_cell_id" "$SECONDARY")
SCC_BLER=$(get_val "dl_bler" "$SECONDARY")
SCC_MIMO=$(get_val "mimo" "$SECONDARY")
SCC_MODULATION=$(get_val "modulation" "$SECONDARY")
SCC_CQI=$(get_val "cqi" "$SECONDARY")
SCC_RSRP=$(strip_unit "$(get_val "ss_rsrp" "$SECONDARY")")
SCC_RSRQ=$(strip_unit "$(get_val "ss_rsrq" "$SECONDARY")")
SCC_SINR=$(strip_unit "$(get_val "ss_sinr" "$SECONDARY")")

ETH_LINK_STATUS=$(get_val "link_status" "$LAN")
ETH_SPEED=$(get_val "speed" "$LAN")
ETH_DUPLEX=$(get_val "duplex_mode" "$LAN")
ETH_UPTIME=$(get_val "connection_uptime" "$LAN")

[ -z "$ETH_LINK_STATUS" ] && ETH_LINK_STATUS="--"
[ -z "$ETH_SPEED" ] && ETH_SPEED="--"
[ -z "$ETH_DUPLEX" ] && ETH_DUPLEX="--"
[ -z "$ETH_UPTIME" ] && ETH_UPTIME="--"

DATA_SENT=$(get_val "data_sent" "$DEVICE_DATA")
DATA_RECEIVED=$(get_val "data_received" "$DEVICE_DATA")
PACKET_LOSS=$(get_val "packet_loss" "$DEVICE_DATA")

[ -z "$DATA_SENT" ] && DATA_SENT="--"
[ -z "$DATA_RECEIVED" ] && DATA_RECEIVED="--"
[ -z "$PACKET_LOSS" ] && PACKET_LOSS="--"

# defaults if secondary/CA cell isn't present
[ -z "$SCC_BAND" ] && SCC_BAND="--"
[ -z "$SCC_BW" ] && SCC_BW="--"
[ -z "$SCC_ARFCN" ] && SCC_ARFCN="--"
[ -z "$SCC_PCI" ] && SCC_PCI="--"
[ -z "$SCC_BLER" ] && SCC_BLER="--"
[ -z "$SCC_MIMO" ] && SCC_MIMO="--"
[ -z "$SCC_MODULATION" ] && SCC_MODULATION="--"
[ -z "$SCC_CQI" ] && SCC_CQI="--"
[ -z "$SCC_RSRP" ] && SCC_RSRP="--"
[ -z "$SCC_RSRQ" ] && SCC_RSRQ="--"
[ -z "$SCC_SINR" ] && SCC_SINR="--"

# ---- Step 3: emit flat JSON (+ thermal_zones & nearby_cells arrays) ----
cat <<EOF
{"server_link":"ONLINE","sim_status":"${SIM_STATUS}","operating_mode":"${OPERATING_MODE}","band":"${BAND}","bandwidth":"${BANDWIDTH}","arfcn":"${ARFCN}","pci":"${PCI}","plmn":"${PLMN}","rrc_state":"${RRC_STATE}","rsrp":"${RSRP}","rsrq":"${RSRQ}","sinr":"${SINR}","bler":"${BLER}","mimo":"${MIMO}","modulation":"${MODULATION}","cqi":"${CQI}","SCC_BAND":"${SCC_BAND}","SCC_BW":"${SCC_BW}","SCC_ARFCN":"${SCC_ARFCN}","SCC_PCI":"${SCC_PCI}","SCC_BLER":"${SCC_BLER}","SCC_MIMO":"${SCC_MIMO}","SCC_MODULATION":"${SCC_MODULATION}","SCC_CQI":"${SCC_CQI}","SCC_RSRP":"${SCC_RSRP}","SCC_RSRQ":"${SCC_RSRQ}","SCC_SINR":"${SCC_SINR}","eth_link_status":"${ETH_LINK_STATUS}","eth_speed":"${ETH_SPEED}","eth_duplex":"${ETH_DUPLEX}","eth_uptime":"${ETH_UPTIME}","data_sent":"${DATA_SENT}","data_received":"${DATA_RECEIVED}","packet_loss":"${PACKET_LOSS}","thermal_zones":${THERMAL_JSON},"odu_cpu_pct":"${CPU_PCT}","odu_cpu_user":"${PCT_USER}","odu_cpu_nice":"${PCT_NICE}","odu_cpu_system":"${PCT_SYSTEM}","odu_cpu_idle":"${PCT_IDLE}","odu_cpu_iowait":"${PCT_IOWAIT}","odu_cpu_irq":"${PCT_IRQ}","odu_cpu_softirq":"${PCT_SOFTIRQ}","odu_cpu_steal":"${PCT_STEAL}","odu_cpu_cores":"${CORES}","odu_cpu_model":"${CPU_MODEL_ESC}","odu_load1":"${LOAD1}","odu_load5":"${LOAD5}","odu_load15":"${LOAD15}","odu_tasks_running":"${TASKS_RUNNING}","odu_tasks_total":"${TASKS_TOTAL}","odu_uptime_sec":"${UPTIME_SEC}","odu_ctxt_rate":"${CTXT_RATE}","odu_intr_rate":"${INTR_RATE}","odu_conntrack_count":"${CONNTRACK_COUNT}","odu_conntrack_max":"${CONNTRACK_MAX}","odu_mem_total_kb":"${MEM_TOTAL_KB}","odu_mem_used_kb":"${MEM_USED_KB}","odu_mem_pct":"${MEM_PCT}","odu_mem_free_kb":"${MEM_FREE_KB}","odu_mem_cached_kb":"${MEM_CACHED_KB}","odu_mem_buffers_kb":"${MEM_BUFFERS_KB}","odu_mem_swap_total_kb":"${MEM_SWAP_TOTAL_KB}","odu_mem_swap_used_kb":"${MEM_SWAP_USED_KB}","nearby_cells":${NEARBY_CELLS_JSON},"cell_lock_status":"${CELL_LOCK_STATUS_ESC}","webui_status":"${WEBUI_STATUS}","telnet_status":"${TELNET_STATUS}"}
EOF
