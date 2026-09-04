#!/bin/sh
# /usr/libexec/jodu5164x_at.sh - Executes AT and CRI commands over Telnet on JODU5164x

CMD="$1"
[ -z "$CMD" ] && exit 1

IP=$(/sbin/uci -q get jodu5164x.main.ip)
[ -z "$IP" ] && IP=$(/sbin/uci -q get jodu5164x.main.host)
[ -z "$IP" ] && IP="192.168.225.1"
USER=$(/sbin/uci -q get jodu5164x.main.user)
[ -z "$USER" ] && USER=$(/sbin/uci -q get jodu5164x.main.telnet_username)
PASS=$(/sbin/uci -q get jodu5164x.main.pass)
[ -z "$PASS" ] && PASS=$(/sbin/uci -q get jodu5164x.main.telnet_password)

# Determine whether to wrap with atcli or run directly
FIRST_WORD=$(echo "$CMD" | awk '{print toupper($1)}')
if echo "$FIRST_WORD" | grep -q '^AT'; then
    EXEC_CMD="/usr/bin/atcli '$CMD'"
else
    EXEC_CMD="$CMD"
fi

# Execute over Telnet
OUTPUT=$( (
    if [ -n "$PASS" ]; then
        sleep 2
        printf '%s\r\n' "$PASS"
        sleep 2
    else
        sleep 1
        printf '\r\n'
        sleep 1
    fi
    printf '%s\r\n' "$EXEC_CMD"
    sleep 2
    printf 'exit\r\n'
    sleep 1
) | nc "$IP" 23 2>/dev/null )

# Clean output
echo "$OUTPUT" | awk '!/^[[:space:]]*$/ && !/'"$FIRST_WORD"'/ && !/root@/ && !/Login/ && !/Password/'
