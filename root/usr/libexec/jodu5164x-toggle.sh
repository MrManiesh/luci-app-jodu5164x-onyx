#!/bin/sh
# =============================================================================
# jodu5164x-toggle.sh
# Monitoring Pause / Resume Controller for Sercomm JODU5164x
#
# Description:
#   Toggles ODU background monitoring state in UCI (/etc/config/jodu5164x).
#   
#   Why this is necessary:
#   The Sercomm ODU firmware strictly enforces a single active WebUI session.
#   If this dashboard holds an active session cookie, any attempt to access the
#   ODU's native management WebUI (https://192.168.225.1) is blocked with an
#   active session collision error.
#   
#   When monitoring is paused ($1 = "0"):
#     - Persists enabled=0 in UCI.
#     - Immediately deletes the session cookie (/tmp/jodu5164x_cookie.txt) so
#       the native ODU WebUI session is freed instantly for the user.
#   
#   When monitoring is resumed ($1 = "1"):
#     - Persists enabled=1 in UCI.
#     - Restarts the background telnet daemon to resume live telemetry.
#
# Arguments:
#   $1 = "1" (enable monitoring) | "0" (pause monitoring)
#
# Output:
#   "OK" on stdout.
#
# Originally created by: Anish (@anishthevictorious)
# Modified by: Manish Matwa Choudhary
# License: All Rights Reserved
# =============================================================================

UCI_PKG="jodu5164x"

# Persist the enabled/disabled state to UCI
uci set ${UCI_PKG}.main.enabled="$1"
uci commit ${UCI_PKG}

# Handle session cleanup or service restart
if [ "$1" = "0" ]; then
    # Release the session cookie so the user can log into native ODU WebUI
    rm -f /tmp/jodu5164x_cookie.txt
else
    # Kick the background updater service to refresh telemetry immediately
    /etc/init.d/jodu5164x-updater restart >/dev/null 2>&1
fi

echo "OK"
