#!/bin/sh
# =============================================================================
# jodu5164x-set-config.sh
# Configuration Writer for Sercomm JODU5164x LuCI Settings
#
# Description:
#   Persists user-configured settings from the LuCI Settings Modal directly
#   to OpenWrt UCI (/etc/config/jodu5164x) and manages automated reboot cron jobs.
#   Called via LuCI's ubus file.exec with an explicit argument list (avoiding
#   shell interpolation so passwords with spaces/symbols are handled safely).
#
# Arguments:
#   $1 = host                     (ODU IP address, e.g. 192.168.225.1)
#   $2 = username                 (WebUI username, default: Admin)
#   $3 = password                 (WebUI login password)
#   $4 = telnet_port              (Telnet port, default: 23)
#   $5 = telnet_password          (Telnet login password, if configured)
#   $6 = reboot_schedule_enabled  (0 = disabled, 1 = enabled)
#   $7 = reboot_schedule_time     (HH:MM 24-hour format, e.g. 03:00)
#   $8 = poll_interval            (1 to 10 seconds, default: 3)
#   $9 = telnet_username          (Optional Telnet username for devices like d2)
#
# Output:
#   "OK" on stdout on success.
#
# Originally created by: Anish (@anishthevictorious)
# Modified by: Manish Matwa Choudhary
# License: GPL-3.0
# =============================================================================

UCI_PKG="jodu5164x"
CRON_FILE="/etc/crontabs/root"
CRON_TAG="# jodu5164x-scheduled-reboot"

# -----------------------------------------------------------------------------
# 1. Update UCI Configuration Options
# -----------------------------------------------------------------------------
uci set ${UCI_PKG}.main.host="$1"
uci set ${UCI_PKG}.main.username="$2"
uci set ${UCI_PKG}.main.password="$3"
uci set ${UCI_PKG}.main.telnet_port="$4"
uci set ${UCI_PKG}.main.telnet_password="$5"
uci set ${UCI_PKG}.main.telnet_username="$9"
uci set ${UCI_PKG}.main.reboot_schedule_enabled="$6"
uci set ${UCI_PKG}.main.reboot_schedule_time="$7"

# Validate polling rate (must be an integer between 1 and 10 seconds)
POLL_INT="$8"
case "$POLL_INT" in
    [1-9]|10) ;;
    *) POLL_INT=3 ;;
esac
uci set ${UCI_PKG}.main.poll_interval="$POLL_INT"

# Commit changes atomically to /etc/config/jodu5164x
uci commit ${UCI_PKG}

# -----------------------------------------------------------------------------
# 2. Automated Scheduled Reboot (Cron Management)
# -----------------------------------------------------------------------------
touch "$CRON_FILE"
# Strip any existing cron entry for jodu5164x scheduled reboot
sed -i "\\|${CRON_TAG}|d" "$CRON_FILE"

# Install fresh cron job if reboot schedule is enabled
if [ "$6" = "1" ] && [ -n "$7" ]; then
    # Parse HH:MM into separate hour and minute numbers, stripping leading zeroes
    HOUR=$(printf '%s' "$7" | cut -d: -f1 | sed 's/^0*//')
    MIN=$(printf '%s' "$7" | cut -d: -f2 | sed 's/^0*//')
    [ -z "$HOUR" ] && HOUR=0
    [ -z "$MIN" ] && MIN=0
    echo "${MIN} ${HOUR} * * * /usr/libexec/jodu5164x-reboot.sh >/dev/null 2>&1 ${CRON_TAG}" >> "$CRON_FILE"
fi

# Reload cron daemon so scheduled changes take effect immediately
/etc/init.d/cron restart >/dev/null 2>&1

# -----------------------------------------------------------------------------
# 3. Cache Invalidation & Daemon Notification
# -----------------------------------------------------------------------------
# Invalidate existing session cookie so next fetch re-authenticates with new credentials
rm -f /tmp/jodu5164x_cookie.txt

# Restart background telnet updater with newly configured credentials and interval
/etc/init.d/jodu5164x-updater restart >/dev/null 2>&1 &

echo "OK"
