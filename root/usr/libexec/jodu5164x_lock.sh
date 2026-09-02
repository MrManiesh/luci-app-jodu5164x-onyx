#!/bin/sh
# jodu5164x_lock.sh
# Locks or unlocks 5G NR Cell on Sercomm JODU5164x using cricli

IP=$(/sbin/uci -q get jodu5164x.main.ip)
[ -z "$IP" ] && IP=$(/sbin/uci -q get jodu5164x.main.host)
[ -z "$IP" ] && IP="192.168.225.1"
USER=$(/sbin/uci -q get jodu5164x.main.user)
[ -z "$USER" ] && USER=$(/sbin/uci -q get jodu5164x.main.telnet_username)
PASS=$(/sbin/uci -q get jodu5164x.main.pass)
[ -z "$PASS" ] && PASS=$(/sbin/uci -q get jodu5164x.main.telnet_password)

NR_ARFCN="$1"
NR_PCI="$2"

[ -z "$NR_ARFCN" ] && NR_ARFCN=$(/sbin/uci -q get jodu5164x.main.arfcn)
[ -z "$NR_PCI" ] && NR_PCI=$(/sbin/uci -q get jodu5164x.main.pci)

if [ -z "$NR_ARFCN" ] || [ -z "$NR_PCI" ]; then
    CMD="cricli set_nr5g_cell_config 2"
else
    CMD="cricli set_nr5g_cell_config 0 ${NR_PCI} ${NR_ARFCN} 1 0 8192 0 0 0 0 0 0"
fi

RUN="telnet ${IP} 23"
if command -v timeout >/dev/null 2>&1; then
    RUN="timeout 12 $RUN"
fi

OUT=$(
{
    sleep 1
    if [ -n "$PASS" ]; then
        printf '%s\r\n' "$PASS"
        sleep 1
    fi
    printf '%s\r\n' "$CMD"
    sleep 2
    printf 'exit\r\n'
    sleep 1
} | $RUN 2>/dev/null
)

echo '{"result":"OK"}'
