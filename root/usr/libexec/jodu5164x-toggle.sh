#!/bin/sh
# jodu5164x-toggle.sh
# Enables/disables the background monitoring. When disabling, also clears
# the cached session cookie so the ODU's own WebUI session (which only
# allows one active login) is freed up immediately for the user.
#
# args: $1 = "1" (enable) or "0" (disable)

UCI_PKG="jodu5164x"

uci set ${UCI_PKG}.main.enabled="$1"
uci commit ${UCI_PKG}

if [ "$1" = "0" ]; then
    rm -f /tmp/jodu5164x_cookie.txt
fi

echo "OK"
