#!/bin/sh
# /usr/libexec/jodu5164x_reboot.sh - Safely reboots JODU5164x ODU

IP=$(/sbin/uci -q get jodu5164x.main.ip)
[ -z "$IP" ] && IP=$(/sbin/uci -q get jodu5164x.main.host)
[ -z "$IP" ] && IP="192.168.225.1"
USER=$(/sbin/uci -q get jodu5164x.main.user)
[ -z "$USER" ] && USER=$(/sbin/uci -q get jodu5164x.main.telnet_username)
PASS=$(/sbin/uci -q get jodu5164x.main.pass)
[ -z "$PASS" ] && PASS=$(/sbin/uci -q get jodu5164x.main.telnet_password)

(
    if [ -n "$USER" ] && [ "$USER" != "none" ]; then
        sleep 2
        echo "$USER"
        sleep 2
        echo "$PASS"
        sleep 2
    else
        sleep 1
        echo ""
        sleep 1
    fi
    echo "reboot"
    sleep 2
    echo "exit"
    sleep 2
) | nc "$IP" 23 >/dev/null 2>&1 &

TELNET_PID=$!
sleep 15
kill -9 $TELNET_PID 2>/dev/null
killall -9 nc 2>/dev/null
