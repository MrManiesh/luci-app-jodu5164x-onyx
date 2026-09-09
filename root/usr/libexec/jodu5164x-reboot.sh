#!/bin/sh
# =============================================================================
# jodu5164x-reboot.sh
# Remote Reboot Trigger for Sercomm JODU5164x 5G ODUs
#
# Description:
#   Initiates a remote system reboot on the ODU by establishing a short-lived
#   Telnet connection and issuing the `reboot` shell command.
#   Uses credentials configured in UCI (/etc/config/jodu5164x).
#
# Output:
#   JSON result on stdout: {"result":"OK|FAILED"}
#
# Originally created by: Anish (@anishthevictorious)
# Modified by: Manish Matwa Choudhary
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
# Verify that the telnet binary is installed on the OpenWrt router
if ! command -v telnet >/dev/null 2>&1; then
    echo '{"result":"FAILED","error":"telnet_unavailable"}'
    exit 1
fi

# -----------------------------------------------------------------------------
# 3. Telnet Connection with Timeout Protection
# -----------------------------------------------------------------------------
RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
if command -v timeout >/dev/null 2>&1; then
    RUN="timeout 10 $RUN"
fi

# -----------------------------------------------------------------------------
# 4. Issue Reboot Command
# -----------------------------------------------------------------------------
{
    sleep 1
    # Send Telnet username if configured (required on d2)
    if [ -n "$TELNET_USER" ]; then
        printf '%s\r\n' "$TELNET_USER"
        sleep 1
    fi
    # Send Telnet password if configured (direct on d1, or after username on d2)
    if [ -n "$TELNET_PASS" ]; then
        printf '%s\r\n' "$TELNET_PASS"
        sleep 1
    fi
    # Send system reboot command to ODU ash shell
    printf 'reboot\r\n'
    sleep 2
} | $RUN >/tmp/jodu5164x_reboot_log.txt 2>&1

# -----------------------------------------------------------------------------
# 5. Output Success Confirmation
# -----------------------------------------------------------------------------
echo '{"result":"OK"}'
