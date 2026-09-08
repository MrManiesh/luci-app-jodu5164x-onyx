#!/bin/sh
# =============================================================================
# jodu5164x-data.sh
# Main Status & Telemetry Collector for Sercomm JODU5164x 5G ODUs
#
# Architecture & Design:
#   1. WebUI HTTP API Collection:
#      - Authenticates via HMAC-SHA256 challenge-response protocol.
#      - Reuses session cookies across polling cycles to avoid re-login overhead.
#      - Automatically re-authenticates if a session cookie expires.
#      - Fetches Primary Cell, Secondary Cell (Carrier Aggregation), LAN/Ethernet,
#        and Device Data counters.
#
#   2. Asynchronous Telnet Telemetry Integration:
#      - Reads pre-cached system telemetry from /tmp/jodu5164x_sys_cache.raw
#        written by the background updater daemon (jodu5164x-telnet-updater.sh).
#      - Never blocks on Telnet I/O during HTTP requests, ensuring sub-50ms execution.
#
#   3. Flat Unified JSON Payload:
#      - Aggregates all cellular, ethernet, hardware, CPU, memory, thermal,
#        neighbouring cells, and tower lock parameters into a single JSON object
#        consumed directly by the LuCI web interface.
#
# Configuration:
#   Options are managed in UCI (/etc/config/jodu5164x):
#     - host            : ODU IP address (default: 192.168.225.1)
#     - username        : WebUI username (default: Admin)
#     - password        : WebUI login password
#     - telnet_port     : Telnet port (default: 23)
#     - telnet_password : Optional Telnet login password
#     - enabled         : 1 = Active Monitoring, 0 = Paused
#
# Originally created by: Anish (@anishthevictorious)
# Modified by: Manish Matwa Choudhary
# License: GPL-3.0
# =============================================================================

# -----------------------------------------------------------------------------
# 1. UCI Configuration & Initialization
# -----------------------------------------------------------------------------
UCI_PKG="jodu5164x"

ODU_HOST=$(uci -q get ${UCI_PKG}.main.host)
[ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"

ODU_USER=$(uci -q get ${UCI_PKG}.main.username)
[ -z "$ODU_USER" ] && ODU_USER="Admin"

ODU_PASS=$(uci -q get ${UCI_PKG}.main.password)

TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port)
[ -z "$TELNET_PORT" ] && TELNET_PORT="23"

TELNET_USER=$(uci -q get ${UCI_PKG}.main.telnet_username)
TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)

ENABLED=$(uci -q get ${UCI_PKG}.main.enabled)
[ -z "$ENABLED" ] && ENABLED="1"

# When monitoring is paused: exit immediately without making any network requests
# so the ODU's single-login session is not tied up.
if [ "$ENABLED" = "0" ]; then
    echo '{"server_link":"DISABLED"}'
    exit 0
fi

# -----------------------------------------------------------------------------
# 2. Parse Requested Active Widgets ($1) & On-Demand Flags
# -----------------------------------------------------------------------------
REQ_WIDGETS="$1"

if [ -z "$REQ_WIDGETS" ] || [ "$REQ_WIDGETS" = "all" ]; then
    WANT_PRIMARY=1
    WANT_SECONDARY=1
    WANT_LAN=1
    WANT_DATA=1
    WANT_NEARBY=1
    WANT_LOC=1
    WANT_THERMAL=1
    WANT_CPU=1
    WANT_MEM=1
    WANT_SYS=1
else
    WANT_PRIMARY=0
    WANT_SECONDARY=0
    WANT_LAN=0
    WANT_DATA=0
    WANT_NEARBY=0
    WANT_LOC=0
    WANT_THERMAL=0
    WANT_CPU=0
    WANT_MEM=0
    WANT_SYS=0

    case ",${REQ_WIDGETS}," in
        *,summary,*|*,primary_cell,*|*,aiming,*) WANT_PRIMARY=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,secondary_cell,*|*,aiming,*) WANT_SECONDARY=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,eth_mgmt,*|*,summary,*) WANT_LAN=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,data_usage,*) WANT_DATA=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,nearby_cells,*) WANT_NEARBY=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,primary_cell,*|*,aiming,*) WANT_LOC=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,thermal,*) WANT_THERMAL=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,cpu_gauge,*|*,cpu_detail,*) WANT_CPU=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,memory,*) WANT_MEM=1 ;;
    esac
    case ",${REQ_WIDGETS}," in
        *,cpu_gauge,*|*,cpu_detail,*|*,eth_mgmt,*) WANT_SYS=1 ;;
    esac
fi

# Notify background telnet updater daemon of actively needed features
NEED_FILE="/tmp/jodu5164x_needed_features"
printf 'TS=%s\nNEARBY=%s\nTHERMAL=%s\nCPU=%s\nMEM=%s\nSYS=%s\n' \
    "$(date +%s)" "$WANT_NEARBY" "$WANT_THERMAL" "$WANT_CPU" "$WANT_MEM" "$WANT_SYS" > "$NEED_FILE" 2>/dev/null

# Secret encryption key required by Sercomm WebUI challenge protocol
ENC_KEY='$1$SERCOMM$'
COOKIE_JAR="/tmp/jodu5164x_cookie.txt"
TIMEOUT=5

# -----------------------------------------------------------------------------
# 2. String Manipulation & Parsing Helpers
# -----------------------------------------------------------------------------

# Extracts a "key":"value" string or numeric field from a flat JSON blob
# Arguments: $1 = key name, $2 = json text
get_val() {
    printf '%s' "$2" | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\?\([^",}]*\)"\?.*/\1/p'
}

# Strips trailing unit text ("dBm" or "dB"), returning pure numeric value
# Arguments: $1 = value with unit (e.g. "-78 dBm")
strip_unit() {
    printf '%s' "$1" | sed -E 's/[[:space:]]*(dBm|dB)$//'
}

# Escapes backslashes and double quotes for safe embedding in JSON strings
# Arguments: $1 = raw string
json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# -----------------------------------------------------------------------------
# 3. Background Daemon Cache Reader & Status
# -----------------------------------------------------------------------------
SYS_CACHE_FILE="/tmp/jodu5164x_sys_cache.raw"
SYS_TS_FILE="/tmp/jodu5164x_sys_ts"
SYS_STATUS_FILE="/tmp/jodu5164x_telnet_status"
WEBUI_STATUS="ok"

TELNET_STATUS=$(cat "$SYS_STATUS_FILE" 2>/dev/null)
[ -z "$TELNET_STATUS" ] && TELNET_STATUS="ok"

read_sys_cache() {
    [ -s "$SYS_CACHE_FILE" ] && cat "$SYS_CACHE_FILE"
}

# Constructs friendly diagnostic error messages for Telnet
get_telnet_message() {
    case "$TELNET_STATUS" in
        unreachable)
            echo "Telnet is unreachable at ${ODU_HOST}:${TELNET_PORT}. Ensure Telnet is enabled on the ODU, or check IP and Port in Settings." ;;
        auth_failed)
            if [ -n "$TELNET_USER" ]; then
                echo "Telnet authentication failed for user '${TELNET_USER}'. Verify your Telnet Username and Password in Settings."
            else
                echo "Telnet authentication failed. Verify your Telnet Password (or configure Telnet Username) in Settings."
            fi ;;
        username_required)
            echo "This device requires a Telnet Username before password (e.g. root or admin). Please configure Telnet Username in Settings." ;;
        no_client)
            echo "Telnet client is missing on the router." ;;
        *)
            echo "" ;;
    esac
}

# Constructs friendly diagnostic error messages when WebUI or Telnet fails
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

    telnet_msg=$(get_telnet_message)

    webui_msg_esc=$(json_escape "$webui_msg")
    telnet_msg_esc=$(json_escape "$telnet_msg")

    echo "{\"server_link\":\"OFFLINE\",\"webui_status\":\"${WEBUI_STATUS}\",\"webui_message\":\"${webui_msg_esc}\",\"telnet_status\":\"${TELNET_STATUS}\",\"telnet_message\":\"${telnet_msg_esc}\"}"
}

# Alert immediately if password is missing from UCI
if [ -z "$ODU_PASS" ]; then
    WEBUI_STATUS="no_password"
    emit_offline_diagnosis
    exit 1
fi

# -----------------------------------------------------------------------------
# 4. WebUI Authentication & API Client
# -----------------------------------------------------------------------------

# Performs Sercomm double HMAC-SHA256 login challenge
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

    # HTTP 000 indicates connection failure (unreachable IP, host down)
    if [ "$CODE" = "000" ]; then
        WEBUI_STATUS="ip_unreachable"
        return 1
    fi

    # Confirm session cookie was granted
    if [ "$CODE" != "200" ] || ! grep -qi QSESSIONID "$COOKIE_JAR" 2>/dev/null; then
        WEBUI_STATUS="wrong_password"
        return 1
    fi

    WEBUI_STATUS="ok"
    return 0
}

# Fetches JSON endpoints using cached session cookie
# Arguments: $1 = endpoint filename
fetch_cell_json() {
    curl -sk --connect-timeout "$TIMEOUT" -b "$COOKIE_JAR" \
        "https://${ODU_HOST}/data/${1}?_=$(date +%s%3N)"
}

# -----------------------------------------------------------------------------
# 5. Low-Level Telemetry Parsers
# -----------------------------------------------------------------------------

# Extracts one STAT<n>_BEGIN..STAT<n>_END block from the cache dump,
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

# Computes per-state CPU percentages (user/nice/system/idle/iowait/irq/softirq/steal)
# from two /proc/stat "cpu" line samples ~1s apart.
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

# Parses "MEM:<Total>:<Free>:<Avail>:<Buffers>:<Cached>:<SwapTotal>:<SwapFree>" (KB)
# into total/used/pct plus the individual breakdown figures.
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

# Parses "TZ:<zone>:<type>:<temp_milli>" lines into a JSON array of sensors
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

# Generic BEGIN/END block extractor (returns raw lines between markers)
extract_block_lines() {
    raw="$1"; marker="$2"
    printf '%s\n' "$raw" | awk -v m="$marker" '
        {
            line = $0
            sub(/^[[:space:]]+/, "", line)
            sub(/[[:space:]]+$/, "", line)
        }
        line == m "_BEGIN" || line ~ ("^.*" m "_BEGIN[[:space:]]*$") { inblk=1; next }
        line == m "_END"   || line ~ ("^.*" m "_END[[:space:]]*$")   { inblk=0; next }
        inblk { print }
    '
}

# Parses Realtek PHY Cable Diagnostic Test (CDT) block into structured JSON:
# { "speed":"1000", "pairs":[{"pair":"1-2","length":"21","status":"normal","fault":"none"}, ...] }
build_cdt_json() {
    raw="$1"
    printf '%s\n' "$raw" | awk '
        BEGIN { speed=""; first=1; pairs="" }
        /link speed:[0-9]+/ {
            sub(/^.*link speed:/, "")
            sub(/\r$/, "")
            speed=$1
        }
        $1 ~ /^[0-9]-[0-9]$/ {
            p=$1; len=$2; st=$3; pp=$4
            sub(/\r$/, "", pp)
            entry = sprintf("{\"pair\":\"%s\",\"length\":\"%s\",\"status\":\"%s\",\"fault\":\"%s\"}", p, len, st, pp)
            if (!first) pairs = pairs "," entry
            else { pairs = entry; first=0 }
        }
        END {
            if (pairs == "") printf "null"
            else printf "{\"speed\":\"%s\",\"pairs\":[%s]}", speed, pairs
        }
    '
}

# Parses 5G NR Cell History lines ("<idx> <ARFCN> <PCI> <RSRP> <RSRQ>" or "+BNRCELLH: ...")
# into a structured JSON array, discarding empty/unused slots (ARFCN=0, PCI=0).
build_nearby_cells_json() {
    raw="$1"
    printf '%s\n' "$raw" | awk '
        BEGIN { printf "["; first=1 }
        # 5-field format: <idx> <ARFCN> <PCI> <RSRP> <RSRQ>
        NF>=5 && $1 ~ /^[0-9][0-9]*$/ && $2 ~ /^[0-9][0-9]*$/ && $3 ~ /^[0-9][0-9]*$/ {
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
        # 4-field format without index: <ARFCN> <PCI> <RSRP> <RSRQ>
        NF>=4 && $1 ~ /^[0-9][0-9]*$/ && $2 ~ /^[0-9][0-9]*$/ && $3 ~ /^-?[0-9]/ {
            arfcn=$1; pci=$2; rsrp=$3; rsrq=$4
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
        # Comma/colon separated format: +BNRCELLH: <pci>,<arfcn>,<rsrp>,<rsrq>
        {
            line = $0
            gsub(/[,:]/, " ", line)
            n = split(line, f)
            for (i = 1; i <= n - 3; i++) {
                if (f[i] ~ /^[0-9][0-9]*$/ && f[i+1] ~ /^[0-9][0-9]*$/ && f[i+2] ~ /^-?[0-9]/) {
                    pci = f[i]; arfcn = f[i+1]; rsrp = f[i+2]; rsrq = f[i+3]
                    if (pci + 0 > 10000 && arfcn + 0 <= 1008) {
                        tmp = pci; pci = arfcn; arfcn = tmp
                    }
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

# Extracts current NR5G cell lock status text (e.g. "UNLOCK" or lock parameters)
extract_lock_status() {
    raw="$1"
    status=$(printf '%s\n' "$raw" | sed -n 's/^NR5G cell config type: *//p' | head -1 | tr -d '\r')
    [ -z "$status" ] && status="UNKNOWN"
    printf '%s' "$status"
}

# Extracts TAC and Global Cell ID from cricli cell_location output
# Returns: "<tac>|<global_cell_id>"
extract_cell_location() {
    raw="$1"
    printf '%s\n' "$raw" | awk '
        /---------- NR5G Info ----------/ { section="nr5g"; next }
        /---------- LTE Info ----------/ { section="lte"; next }
        /^[[:space:]]*tac:[[:space:]]*/ {
            sub(/^[[:space:]]*tac:[[:space:]]*/, "")
            sub(/\r$/, "")
            val = $0
            if (section == "nr5g") nr_tac = val
            else if (section == "lte") lte_tac = val
        }
        /^[[:space:]]*global cell id:[[:space:]]*/ {
            sub(/^[[:space:]]*global cell id:[[:space:]]*/, "")
            sub(/\r$/, "")
            val = $0
            if (section == "nr5g") nr_cid = val
            else if (section == "lte") lte_cid = val
        }
        END {
            tac = (nr_tac != "" && nr_tac != "0") ? nr_tac : lte_tac
            cid = (nr_cid != "" && nr_cid != "0") ? nr_cid : lte_cid
            if (tac == "") tac = "--"
            if (cid == "") cid = "--"
            printf "%s|%s", tac, cid
        }
    '
}

# -----------------------------------------------------------------------------
# 6. Step 1: WebUI Session Verification & Data Retrieval
# -----------------------------------------------------------------------------
# Verify existing cached cookie or perform fresh login
if [ ! -s "$COOKIE_JAR" ]; then
    do_login || { emit_offline_diagnosis; exit 1; }
fi

PRIMARY=""
if [ "$WANT_PRIMARY" = "1" ] || [ "$WANT_SECONDARY" = "1" ] || [ "$WANT_LAN" = "1" ] || [ "$WANT_DATA" = "1" ]; then
    PRIMARY=$(fetch_cell_json "network_status_cell_parameters.json")

    # If session expired, response is empty or error page; auto re-login once
    if [ -z "$PRIMARY" ] || ! printf '%s' "$PRIMARY" | grep -qE '"signal_strength"|"operating_mode"|"band"|"nr_earcn"'; then
        do_login || { emit_offline_diagnosis; exit 1; }
        PRIMARY=$(fetch_cell_json "network_status_cell_parameters.json")
    fi

    if [ -z "$PRIMARY" ]; then
        WEBUI_STATUS="fetch_failed"
        emit_offline_diagnosis
        exit 1
    fi
fi

# Fetch secondary (Carrier Aggregation), LAN port, and data volume JSONs only when requested
SECONDARY=""
[ "$WANT_SECONDARY" = "1" ] && SECONDARY=$(fetch_cell_json "network_status_secondary_cell_parameters.json")

LAN=""
[ "$WANT_LAN" = "1" ] && LAN=$(fetch_cell_json "network_status_lan.json")

DEVICE_DATA=""
[ "$WANT_DATA" = "1" ] && DEVICE_DATA=$(fetch_cell_json "network_status_device_data.json")

# -----------------------------------------------------------------------------
# 7. Step 2: Extract & Calculate Telemetry Metrics (On-Demand)
# -----------------------------------------------------------------------------
SYS_RAW=$(read_sys_cache)
SYS_RAW=$(printf '%s' "$SYS_RAW" | tr -d '\r')

# Thermal Telemetry
if [ "$WANT_THERMAL" = "1" ]; then
    THERMAL_JSON=$(build_thermal_json "$SYS_RAW")
else
    THERMAL_JSON="[]"
fi

# Nearby Cell Scanning & Cell Lock Configuration
if [ "$WANT_NEARBY" = "1" ]; then
    NEARBY_RAW=$(extract_block_lines "$SYS_RAW" "NEARBY")
    NEARBY_CELLS_JSON=$(build_nearby_cells_json "$NEARBY_RAW")
    LOCKCFG_RAW=$(extract_block_lines "$SYS_RAW" "LOCKCFG")
    CELL_LOCK_STATUS=$(extract_lock_status "$LOCKCFG_RAW")
else
    NEARBY_RAW=""
    NEARBY_CELLS_JSON="[]"
    CELL_LOCK_STATUS="UNLOCK"
fi
CELL_LOCK_STATUS_ESC=$(json_escape "$CELL_LOCK_STATUS")

# Cell Location & Tower Identifiers (cricli cell_location)
if [ "$WANT_LOC" = "1" ]; then
    LOC_RAW=$(extract_block_lines "$SYS_RAW" "LOC")
    CELL_LOC=$(extract_cell_location "$LOC_RAW")
    TAC=$(printf '%s' "$CELL_LOC" | cut -d'|' -f1)
    GLOBAL_CELL_ID=$(printf '%s' "$CELL_LOC" | cut -d'|' -f2)
    # If nearby was not extracted above, extract it now for timing advance
    [ -z "$NEARBY_RAW" ] && NEARBY_RAW=$(extract_block_lines "$SYS_RAW" "NEARBY")
    TIMING_ADVANCE=$(printf '%s\n' "$NEARBY_RAW" | sed -n 's/^[[:space:]]*TIMING ADVANCE:[[:space:]]*//p' | head -1 | tr -d '\r')
else
    TAC="--"
    GLOBAL_CELL_ID="--"
    TIMING_ADVANCE="--"
fi
[ -z "$TAC" ] && TAC="--"
[ -z "$GLOBAL_CELL_ID" ] && GLOBAL_CELL_ID="--"
[ -z "$TIMING_ADVANCE" ] && TIMING_ADVANCE="--"
TAC_ESC=$(json_escape "$TAC")
GLOBAL_CELL_ID_ESC=$(json_escape "$GLOBAL_CELL_ID")

# Cable Diagnostic Test (CDT) / Physical Wire Pair Health
if [ "$WANT_LAN" = "1" ] || [ "$WANT_SYS" = "1" ]; then
    CDT_RAW=$(extract_block_lines "$SYS_RAW" "CDT")
    CDT_JSON=$(build_cdt_json "$CDT_RAW")
else
    CDT_JSON="null"
fi
[ -z "$CDT_JSON" ] && CDT_JSON="null"

# CPU State Delta Breakdown
if [ "$WANT_CPU" = "1" ]; then
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
else
    CPU_PCT="--"
    PCT_USER="--"
    PCT_NICE="--"
    PCT_SYSTEM="--"
    PCT_IDLE="--"
    PCT_IOWAIT="--"
    PCT_IRQ="--"
    PCT_SOFTIRQ="--"
    PCT_STEAL="--"
    CTXT_RATE="--"
    INTR_RATE="--"
    PROCS_RUNNING="--"
fi

# Memory Statistics
if [ "$WANT_MEM" = "1" ]; then
    MEM_STATS=$(compute_mem_stats "$SYS_RAW")
    MEM_TOTAL_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f1)
    MEM_USED_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f2)
    MEM_PCT=$(printf '%s' "$MEM_STATS" | cut -d: -f3)
    MEM_FREE_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f4)
    MEM_CACHED_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f5)
    MEM_BUFFERS_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f6)
    MEM_SWAP_TOTAL_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f7)
    MEM_SWAP_USED_KB=$(printf '%s' "$MEM_STATS" | cut -d: -f8)
else
    MEM_TOTAL_KB="--"
    MEM_USED_KB="--"
    MEM_PCT="--"
    MEM_FREE_KB="--"
    MEM_CACHED_KB="--"
    MEM_BUFFERS_KB="--"
    MEM_SWAP_TOTAL_KB="--"
    MEM_SWAP_USED_KB="--"
fi

# Load Averages, Tasks, Uptime, Cores, Model, and Conntrack
if [ "$WANT_SYS" = "1" ]; then
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
else
    LOAD1="--"
    LOAD5="--"
    LOAD15="--"
    TASKS_RUNNING="--"
    TASKS_TOTAL="--"
    UPTIME_SEC="--"
    CORES="--"
    CPU_MODEL="Unknown"
    CONNTRACK_COUNT="--"
    CONNTRACK_MAX="--"
fi

# Default any empty numeric variables to "--"
for v in CPU_PCT PCT_USER PCT_NICE PCT_SYSTEM PCT_IDLE PCT_IOWAIT PCT_IRQ PCT_SOFTIRQ PCT_STEAL \
         MEM_TOTAL_KB MEM_USED_KB MEM_PCT MEM_FREE_KB MEM_CACHED_KB MEM_BUFFERS_KB MEM_SWAP_TOTAL_KB MEM_SWAP_USED_KB \
         LOAD1 LOAD5 LOAD15 TASKS_RUNNING TASKS_TOTAL UPTIME_SEC CORES CTXT_RATE INTR_RATE CONNTRACK_COUNT CONNTRACK_MAX; do
    eval "val=\$$v"
    [ -z "$val" ] && eval "$v=--"
done
[ -z "$CPU_MODEL" ] && CPU_MODEL="Unknown"
CPU_MODEL_ESC=$(json_escape "$CPU_MODEL")

# -----------------------------------------------------------------------------
# 8. Extract Cellular, Ethernet & Data Volume Fields
# -----------------------------------------------------------------------------
OPERATING_MODE=$(get_val "operating_mode" "$PRIMARY")
SIGNAL_STRENGTH=$(get_val "signal_strength" "$PRIMARY")
[ -z "$SIGNAL_STRENGTH" ] && SIGNAL_STRENGTH="--"

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

# Secondary Cell (Carrier Aggregation / SCC)
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

# Ethernet Link Status
ETH_LINK_STATUS=$(get_val "link_status" "$LAN")
ETH_SPEED=$(get_val "speed" "$LAN")
ETH_DUPLEX=$(get_val "duplex_mode" "$LAN")
ETH_UPTIME=$(get_val "connection_uptime" "$LAN")

[ -z "$ETH_LINK_STATUS" ] && ETH_LINK_STATUS="--"
[ -z "$ETH_SPEED" ] && ETH_SPEED="--"
[ -z "$ETH_DUPLEX" ] && ETH_DUPLEX="--"
[ -z "$ETH_UPTIME" ] && ETH_UPTIME="--"

# Data Volume & Traffic Counters
DATA_SENT=$(get_val "data_sent" "$DEVICE_DATA")
DATA_RECEIVED=$(get_val "data_received" "$DEVICE_DATA")
PACKET_LOSS=$(get_val "packet_loss" "$DEVICE_DATA")

[ -z "$DATA_SENT" ] && DATA_SENT="--"
[ -z "$DATA_RECEIVED" ] && DATA_RECEIVED="--"
[ -z "$PACKET_LOSS" ] && PACKET_LOSS="--"

# Defaults if Secondary/CA Cell is inactive
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

# -----------------------------------------------------------------------------
# 9. Step 3: Emit Flat JSON Payload
# -----------------------------------------------------------------------------
TELNET_MSG=$(get_telnet_message)
TELNET_MSG_ESC=$(json_escape "$TELNET_MSG")

cat <<EOF
{"server_link":"ONLINE","sim_status":"${SIM_STATUS}","signal_strength":"${SIGNAL_STRENGTH}","operating_mode":"${OPERATING_MODE}","band":"${BAND}","bandwidth":"${BANDWIDTH}","arfcn":"${ARFCN}","pci":"${PCI}","plmn":"${PLMN}","rrc_state":"${RRC_STATE}","rsrp":"${RSRP}","rsrq":"${RSRQ}","sinr":"${SINR}","bler":"${BLER}","mimo":"${MIMO}","modulation":"${MODULATION}","cqi":"${CQI}","SCC_BAND":"${SCC_BAND}","SCC_BW":"${SCC_BW}","SCC_ARFCN":"${SCC_ARFCN}","SCC_PCI":"${SCC_PCI}","SCC_BLER":"${SCC_BLER}","SCC_MIMO":"${SCC_MIMO}","SCC_MODULATION":"${SCC_MODULATION}","SCC_CQI":"${SCC_CQI}","SCC_RSRP":"${SCC_RSRP}","SCC_RSRQ":"${SCC_RSRQ}","SCC_SINR":"${SCC_SINR}","eth_link_status":"${ETH_LINK_STATUS}","eth_speed":"${ETH_SPEED}","eth_duplex":"${ETH_DUPLEX}","eth_uptime":"${ETH_UPTIME}","cdt":${CDT_JSON},"data_sent":"${DATA_SENT}","data_received":"${DATA_RECEIVED}","packet_loss":"${PACKET_LOSS}","thermal_zones":${THERMAL_JSON},"odu_cpu_pct":"${CPU_PCT}","odu_cpu_user":"${PCT_USER}","odu_cpu_nice":"${PCT_NICE}","odu_cpu_system":"${PCT_SYSTEM}","odu_cpu_idle":"${PCT_IDLE}","odu_cpu_iowait":"${PCT_IOWAIT}","odu_cpu_irq":"${PCT_IRQ}","odu_cpu_softirq":"${PCT_SOFTIRQ}","odu_cpu_steal":"${PCT_STEAL}","odu_cpu_cores":"${CORES}","odu_cpu_model":"${CPU_MODEL_ESC}","odu_load1":"${LOAD1}","odu_load5":"${LOAD5}","odu_load15":"${LOAD15}","odu_tasks_running":"${TASKS_RUNNING}","odu_tasks_total":"${TASKS_TOTAL}","odu_uptime_sec":"${UPTIME_SEC}","odu_ctxt_rate":"${CTXT_RATE}","odu_intr_rate":"${INTR_RATE}","odu_conntrack_count":"${CONNTRACK_COUNT}","odu_conntrack_max":"${CONNTRACK_MAX}","odu_mem_total_kb":"${MEM_TOTAL_KB}","odu_mem_used_kb":"${MEM_USED_KB}","odu_mem_pct":"${MEM_PCT}","odu_mem_free_kb":"${MEM_FREE_KB}","odu_mem_cached_kb":"${MEM_CACHED_KB}","odu_mem_buffers_kb":"${MEM_BUFFERS_KB}","odu_mem_swap_total_kb":"${MEM_SWAP_TOTAL_KB}","odu_mem_swap_used_kb":"${MEM_SWAP_USED_KB}","nearby_cells":${NEARBY_CELLS_JSON},"cell_lock_status":"${CELL_LOCK_STATUS_ESC}","tac":"${TAC_ESC}","global_cell_id":"${GLOBAL_CELL_ID_ESC}","timing_advance":"${TIMING_ADVANCE}","webui_status":"${WEBUI_STATUS}","telnet_status":"${TELNET_STATUS}","telnet_message":"${TELNET_MSG_ESC}"}
EOF
