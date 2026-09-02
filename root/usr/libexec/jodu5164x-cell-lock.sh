#!/bin/sh
# jodu5164x-cell-lock.sh
# Locks the modem to a specific cell (by PCI+ARFCN) or unlocks it, via
# telnet + cricli. Uses the same UCI-configured host/telnet settings as
# the main collector script.
#
# args: $1 = "lock" | "unlock"
#       $2 = PCI    (required when action=lock)
#       $3 = ARFCN  (required when action=lock)

UCI_PKG="jodu5164x"
ODU_HOST=$(uci -q get ${UCI_PKG}.main.host); [ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"
TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port); [ -z "$TELNET_PORT" ] && TELNET_PORT="23"
TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)

if ! command -v telnet >/dev/null 2>&1; then
    echo '{"result":"FAILED","error":"telnet_unavailable"}'
    exit 1
fi

case "$1" in
    lock)
        PCI="$2"
        ARFCN="$3"
        case "$PCI" in ''|*[!0-9]*)
            echo '{"result":"FAILED","error":"invalid_pci"}'; exit 1 ;;
        esac
        case "$ARFCN" in ''|*[!0-9]*)
            echo '{"result":"FAILED","error":"invalid_arfcn"}'; exit 1 ;;
        esac
        CMD="cricli set_nr5g_cell_config 0 ${PCI} ${ARFCN} 1 0 8192 0 0 0 0 0 0"
        ;;
    unlock)
        CMD="cricli set_nr5g_cell_config 2"
        ;;
    *)
        echo '{"result":"FAILED","error":"invalid_action"}'
        exit 1
        ;;
esac

RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
if command -v timeout >/dev/null 2>&1; then
    RUN="timeout 12 $RUN"
fi

OUT=$(
{
    sleep 1
    if [ -n "$TELNET_PASS" ]; then
        printf '%s\r\n' "$TELNET_PASS"
        sleep 1
    fi
    printf '%s\r\n' "$CMD"
    sleep 2
    printf 'exit\r\n'
    sleep 1
} | $RUN 2>/dev/null
)

# collapse to a single line and JSON-escape for safe embedding
ESC=$(printf '%s' "$OUT" | tr '\r\n' '  ' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/  */ /g')

echo "{\"result\":\"OK\",\"output\":\"${ESC}\"}"
