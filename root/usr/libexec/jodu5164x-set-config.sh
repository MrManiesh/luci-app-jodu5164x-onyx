#!/bin/sh
# jodu5164x-set-config.sh
# Writes the Settings-modal values straight to UCI and commits immediately.
# Called via ubus file.exec with argv (no shell interpolation), so values
# with spaces/special characters are safe.
#
# args: $1=host $2=username $3=password $4=telnet_port $5=telnet_password
#       $6=reboot_schedule_enabled (0/1) $7=reboot_schedule_time (HH:MM)
#       $8=telnet_username

UCI_PKG="jodu5164x"
CRON_FILE="/etc/crontabs/root"
CRON_TAG="# jodu5164x-scheduled-reboot"

uci set ${UCI_PKG}.main.host="$1"
uci set ${UCI_PKG}.main.username="$2"
uci set ${UCI_PKG}.main.password="$3"
uci set ${UCI_PKG}.main.telnet_port="$4"
uci set ${UCI_PKG}.main.telnet_password="$5"
uci set ${UCI_PKG}.main.reboot_schedule_enabled="$6"
uci set ${UCI_PKG}.main.reboot_schedule_time="$7"
uci set ${UCI_PKG}.main.telnet_username="$8"
uci commit ${UCI_PKG}

# ---- manage the scheduled-reboot cron entry ----
touch "$CRON_FILE"
sed -i "\\|${CRON_TAG}|d" "$CRON_FILE"

if [ "$6" = "1" ] && [ -n "$7" ]; then
    HOUR=$(printf '%s' "$7" | cut -d: -f1 | sed 's/^0*//')
    MIN=$(printf '%s' "$7" | cut -d: -f2 | sed 's/^0*//')
    [ -z "$HOUR" ] && HOUR=0
    [ -z "$MIN" ] && MIN=0
    echo "${MIN} ${HOUR} * * * /usr/libexec/jodu5164x-reboot.sh >/dev/null 2>&1 ${CRON_TAG}" >> "$CRON_FILE"
fi

/etc/init.d/cron restart >/dev/null 2>&1

echo "OK"
