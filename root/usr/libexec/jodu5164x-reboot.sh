#!/bin/sh
# jodu5164x-reboot.sh
# Telnets into the ODU and issues a plain "reboot" command.
# Uses the same UCI-configured host/telnet port/password as the main
# collector script.

UCI_PKG="jodu5164x"
ODU_HOST=$(uci -q get ${UCI_PKG}.main.host); [ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"
TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port); [ -z "$TELNET_PORT" ] && TELNET_PORT="23"
TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)

if ! command -v telnet >/dev/null 2>&1; then
    echo '{"result":"FAILED","error":"telnet_unavailable"}'
    exit 1
fi

RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
if command -v timeout >/dev/null 2>&1; then
    RUN="timeout 10 $RUN"
fi

{
    sleep 1
    if [ -n "$TELNET_PASS" ]; then
        printf '%s\r\n' "$TELNET_PASS"
        sleep 1
    fi
    printf 'reboot\r\n'
    sleep 2
} | $RUN >/tmp/jodu5164x_reboot_log.txt 2>&1

echo '{"result":"OK"}'
