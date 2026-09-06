#!/bin/sh
# =============================================================================
# jodu5164x-cell-lock.sh
# 5G NR Cell Locking and Unlocking Utility for Sercomm JODU5164x ODUs
#
# Description:
#   Connects to the ODU over Telnet to configure 5G NR carrier/tower locking
#   using the internal Qualcomm/Sercomm `cricli set_nr5g_cell_config` utility.
#   Uses credentials and network parameters defined in UCI (/etc/config/jodu5164x).
#
# Arguments:
#   $1 = Action ("lock" | "unlock")
#   $2 = Physical Cell ID (PCI)     [Required for "lock"]
#   $3 = NR-ARFCN Channel Number    [Required for "lock"]
#
# Output:
#   JSON object on stdout: {"result":"OK|FAILED", ...}
#
# Author: Manish Matwa Choudhary
# License: GPL-3.0
# =============================================================================

# -----------------------------------------------------------------------------
# 1. UCI Configuration & Defaults
# -----------------------------------------------------------------------------
UCI_PKG="jodu5164x"

# Read target ODU IP address from UCI (defaults to standard 192.168.225.1)
ODU_HOST=$(uci -q get ${UCI_PKG}.main.host)
[ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"

# Read Telnet port from UCI (defaults to standard port 23)
TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port)
[ -z "$TELNET_PORT" ] && TELNET_PORT="23"

# Read Telnet login password from UCI (if configured)
TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)

# -----------------------------------------------------------------------------
# 2. Dependency Check
# -----------------------------------------------------------------------------
# Verify that the telnet binary is installed on the OpenWrt router
if ! command -v telnet >/dev/null 2>&1; then
    echo '{"result":"FAILED","error":"telnet_unavailable"}'
    exit 1
fi

# -----------------------------------------------------------------------------
# 3. Argument Validation & Command Construction
# -----------------------------------------------------------------------------
case "$1" in
    lock)
        PCI="$2"
        ARFCN="$3"

        # Validate that PCI is non-empty and contains only numeric digits
        case "$PCI" in ''|*[!0-9]*)
            echo '{"result":"FAILED","error":"invalid_pci"}'
            exit 1
            ;;
        esac

        # Validate that ARFCN is non-empty and contains only numeric digits
        case "$ARFCN" in ''|*[!0-9]*)
            echo '{"result":"FAILED","error":"invalid_arfcn"}'
            exit 1
            ;;
        esac

        # Command to bind the modem to the specified 5G NR cell:
        # Syntax: cricli set_nr5g_cell_config <mode=0 (lock)> <PCI> <ARFCN> ...
        CMD="cricli set_nr5g_cell_config 0 ${PCI} ${ARFCN} 1 0 8192 0 0 0 0 0 0"
        ;;

    unlock)
        # Command to unlock the cell and restore automatic tower selection:
        # Syntax: cricli set_nr5g_cell_config <mode=2 (unlock/auto)>
        CMD="cricli set_nr5g_cell_config 2"
        ;;

    *)
        echo '{"result":"FAILED","error":"invalid_action"}'
        exit 1
        ;;
esac

# -----------------------------------------------------------------------------
# 4. Telnet Execution with Timeout Protection
# -----------------------------------------------------------------------------
RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
if command -v timeout >/dev/null 2>&1; then
    RUN="timeout 12 $RUN"
fi

# Execute interactive Telnet session stream
OUT=$(
{
    sleep 1
    # Send Telnet password if configured
    if [ -n "$TELNET_PASS" ]; then
        printf '%s\r\n' "$TELNET_PASS"
        sleep 1
    fi
    # Send cell lock/unlock command
    printf '%s\r\n' "$CMD"
    sleep 2
    # Terminate session cleanly
    printf 'exit\r\n'
    sleep 1
} | $RUN 2>/dev/null
)

# -----------------------------------------------------------------------------
# 5. Background Updater Refresh
# -----------------------------------------------------------------------------
# Restart the background updater daemon asynchronously so the LuCI dashboard
# reflects the new cell lock state on the very next polling cycle.
/etc/init.d/jodu5164x-updater restart >/dev/null 2>&1 &

# -----------------------------------------------------------------------------
# 6. JSON Response Output
# -----------------------------------------------------------------------------
# Collapse multiline telnet output to a single line and JSON-escape quotes/slashes
ESC=$(printf '%s' "$OUT" | tr '\r\n' '  ' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/  */ /g')

echo "{\"result\":\"OK\",\"output\":\"${ESC}\"}"
