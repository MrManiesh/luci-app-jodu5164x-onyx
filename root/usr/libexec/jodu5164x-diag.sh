#!/bin/sh
# jodu5164x-diag.sh
# Diagnostic command runner for Sercomm ODU (JODU51641/JODU51642).
# Safely executes read-only diagnostic commands over telnet and returns JSON.
#
# Usage: /usr/libexec/jodu5164x-diag.sh <cmd_id>

UCI_PKG="jodu5164x"
ODU_HOST=$(uci -q get ${UCI_PKG}.main.host); [ -z "$ODU_HOST" ] && ODU_HOST="192.168.225.1"
TELNET_PORT=$(uci -q get ${UCI_PKG}.main.telnet_port); [ -z "$TELNET_PORT" ] && TELNET_PORT="23"
TELNET_PASS=$(uci -q get ${UCI_PKG}.main.telnet_password)

if ! command -v telnet >/dev/null 2>&1; then
    echo '{"result":"FAILED","error":"telnet_unavailable"}'
    exit 1
fi

CMD_ID="$1"
TARGET_CMD=""

case "$CMD_ID" in
    cell_location)
        TARGET_CMD="cricli cell_location" ;;
    nr_info)
        TARGET_CMD="atcli 'AT+BNRINFO'" ;;
    ca_info)
        TARGET_CMD="atcli 'AT+NRCAINFO'" ;;
    nearby)
        TARGET_CMD="atcli 'AT+BNRCELLH=?'" ;;
    signal)
        TARGET_CMD="cricli signal" ;;
    band)
        TARGET_CMD="cricli band" ;;
    wwan_stats)
        TARGET_CMD="cricli wwan_stats" ;;
    perso_info)
        TARGET_CMD="cricli get_perso_info" ;;
    lock_status)
        TARGET_CMD="cricli get_nr5g_cell_config" ;;
    *)
        echo '{"result":"FAILED","error":"unsupported_command"}'
        exit 1
        ;;
esac

RUN="telnet ${ODU_HOST} ${TELNET_PORT}"
if command -v timeout >/dev/null 2>&1; then
    RUN="timeout 12 $RUN"
fi

RAW_OUT=$(
{
    sleep 1
    if [ -n "$TELNET_PASS" ]; then
        printf '%s\r\n' "$TELNET_PASS"
        sleep 1
    fi
    printf '%s\r\n' "$TARGET_CMD"
    sleep 3
    printf 'exit\r\n'
    sleep 1
} | $RUN 2>&1
)

# JSON-escape the raw output
ESC_OUT=$(printf '%s' "$RAW_OUT" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk '{printf "%s\\n", $0}')

cat <<EOF
{"result":"OK","command":"${TARGET_CMD}","output":"${ESC_OUT}"}
EOF
