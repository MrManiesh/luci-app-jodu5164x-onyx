#!/bin/sh
# =============================================================================
# jodu5164x-diag.sh
# Diagnostic Command Runner for Sercomm JODU5164x 5G ODUs
#
# Description:
#   Executes predefined read-only diagnostic commands on the ODU over Telnet
#   and returns the formatted output in a structured JSON response.
#   Only allows whitelisted diagnostic commands to prevent arbitrary execution.
#
# Usage:
#   /usr/libexec/jodu5164x-diag.sh <cmd_id>
#
# Supported Command IDs:
#   - cell_location : Queries physical cell coordinates and location parameters
#   - nr_info       : Dumps 5G NR network parameters (AT+BNRINFO)
#   - ca_info       : Carrier Aggregation status and SCC channels (AT+NRCAINFO)
#   - nearby        : Serving and neighbouring cell RF info (AT+QENG="servingcell")
#   - signal        : Real-time radio signal quality metrics (cricli signal)
#   - band          : Operational 5G frequency band details (cricli band)
#   - wwan_stats    : WWAN packet throughput and data counters (cricli wwan_stats)
#   - perso_info    : Hardware provisioning and SIM personalization info
#   - lock_status   : Current 5G NR cell lock configuration state
#

# Author: Manish Matwa Choudhary
# License: All Rights Reserved
# =============================================================================

# -----------------------------------------------------------------------------
# 1. UCI Configuration & Defaults
# -----------------------------------------------------------------------------
UCI_PKG="jodu5164x"

# Target ODU IP address (defaults to 192.168.225.1)
ODU_HOST=$(uci -q get ${UCI_PKG}.main.host)
[ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"

# Telnet port (defaults to 23)
TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port)
[ -z "$TELNET_PORT" ] && TELNET_PORT="23"

# Telnet credentials (if set)
TELNET_USER=$(uci -q get ${UCI_PKG}.main.telnet_username)
TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)

# -----------------------------------------------------------------------------
# 2. Dependency Check
# -----------------------------------------------------------------------------
# Ensure the Telnet client is present on the router
if ! command -v telnet >/dev/null 2>&1; then
    echo '{"result":"FAILED","error":"telnet_unavailable"}'
    exit 1
fi

# -----------------------------------------------------------------------------
# 3. Command Whitelist & Mapping
# -----------------------------------------------------------------------------
CMD_ID="$1"
TARGET_CMD=""

case "$CMD_ID" in
    cell_location)
        TARGET_CMD="cricli cell_location" ;;
    nr_info)
        TARGET_CMD="atcli 'AT+BNRINFO'" ;;
    ca_info)
        TARGET_CMD="atcli 'AT+NRCAINFO'" ;;
    nearby)
        TARGET_CMD="atcli 'AT+QENG=\"servingcell\"'" ;;
    signal)
        TARGET_CMD="cricli signal" ;;
    band)
        TARGET_CMD="cricli band" ;;
    wwan_stats)
        TARGET_CMD="cricli wwan_stats" ;;
    perso_info)
        TARGET_CMD="cricli get_perso_info" ;;
    lock_status)
        TARGET_CMD="cricli get_nr5g_cell_config" ;;
    *)
        echo '{"result":"FAILED","error":"unsupported_command"}'
        exit 1
        ;;
esac

# -----------------------------------------------------------------------------
# 4. Telnet Session Execution
# -----------------------------------------------------------------------------
RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
if command -v timeout >/dev/null 2>&1; then
    RUN="timeout 12 $RUN"
fi

RAW_OUT=$(
{
    sleep 1
    # Send username if configured (required on d2)
    if [ -n "$TELNET_USER" ]; then
        printf '%s\r\n' "$TELNET_USER"
        sleep 1
    fi
    # Send password if configured (direct on d1, or after username on d2)
    if [ -n "$TELNET_PASS" ]; then
        printf '%s\r\n' "$TELNET_PASS"
        sleep 1
    fi
    # Execute requested diagnostic command
    printf '%s\r\n' "$TARGET_CMD"
    sleep 3
    # Exit session cleanly
    printf 'exit\r\n'
    sleep 1
} | $RUN 2>&1
)

# -----------------------------------------------------------------------------
# 5. JSON Formatting & Output
# -----------------------------------------------------------------------------
# Escape backslashes and quotes, and preserve newlines as \n literals for JSON
ESC_OUT=$(printf '%s' "$RAW_OUT" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk '{printf "%s\\n", $0}')

cat <<EOF
{"result":"OK","command":"${TARGET_CMD}","output":"${ESC_OUT}"}
EOF
