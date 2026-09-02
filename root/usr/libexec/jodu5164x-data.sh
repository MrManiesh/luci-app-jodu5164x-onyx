#!/bin/sh

IP=$(/sbin/uci -q get jodu5164x.main.ip)
[ -z "$IP" ] && IP=$(/sbin/uci -q get jodu5164x.main.host)
[ -z "$IP" ] && IP="192.168.225.1"

if [ -f /tmp/odu5164x_force_setup ]; then
    NEW_IP=$(awk 'NR==1' /tmp/odu5164x_force_setup)
    rm -f /tmp/odu5164x_force_setup
    
    if [ -n "$NEW_IP" ]; then
        /sbin/uci set jodu5164x.main.ip="$NEW_IP"
        /sbin/uci commit jodu5164x
    fi
    
    IP=$(/sbin/uci -q get jodu5164x.main.ip)
    [ -z "$IP" ] && IP=$(/sbin/uci -q get jodu5164x.main.host)
    [ -z "$IP" ] && IP="192.168.225.1"
    
    echo "PROVISIONING" > /tmp/odu5164x_setup.lock
    /usr/libexec/jodu5164x-setup.sh >/dev/null 2>&1 &
    echo '{"server_link":"PROVISIONING"}'
    exit 0
fi

STATUS=$(wget -q -O - -T 3 "http://$IP:8080/status.txt" 2>/dev/null | tr -d '\r')

if ! echo "$STATUS" | grep -q -e '---UPTIME---' || ! echo "$STATUS" | grep -q -e '5164x-1.0.0-r3'; then
    FAIL_COUNT=$(cat /tmp/odu_fail_count 2>/dev/null || echo "0")
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$FAIL_COUNT" > /tmp/odu_fail_count

    if [ -f /tmp/odu5164x_setup.lock ]; then
        STATE=$(cat /tmp/odu5164x_setup.lock)
        [ -z "$STATE" ] && STATE="PROVISIONING"
        echo "{\"server_link\":\"$STATE\"}"
        exit 0
    elif [ "$FAIL_COUNT" -ge 4 ]; then
        echo "0" > /tmp/odu_fail_count
        echo "PROVISIONING" > /tmp/odu5164x_setup.lock
        /usr/libexec/jodu5164x-setup.sh >/dev/null 2>&1 &
        echo '{"server_link":"PROVISIONING"}'
        exit 0
    else
        echo '{"server_link":"OFFLINE"}'
        exit 0
    fi
else
    rm -f /tmp/odu_fail_count
    rm -f /tmp/odu5164x_setup.lock
fi

STATUS=$(printf '%s' "$STATUS" | tr -d '\r')

BNRINFO=$(echo "$STATUS" | sed -n '/---BNRINFO---/,/---NRCAINFO---/p')
NRCAINFO=$(echo "$STATUS" | sed -n '/---NRCAINFO---/,/---CRI_CELL---/p')
CRI_CELL=$(echo "$STATUS" | sed -n '/---CRI_CELL---/,/---CRI_BAND---/p')
CRI_BAND=$(echo "$STATUS" | sed -n '/---CRI_BAND---/,/---BNRCELLH---/p')
BNRCELLH=$(echo "$STATUS" | sed -n '/---BNRCELLH---/,/---CPU---/p')

NR5G_INFO=$(echo "$CRI_CELL" | sed -n '/---------- NR5G Info ----------/,$p')

PCID=$(echo "$NR5G_INFO" | grep -i '^pci:' | awk -F':' '{print $2}' | tr -d ' ' | head -n1)
[ -z "$PCID" ] && PCID=$(echo "$BNRINFO" | grep -o -E 'physical cell ID:[0-9]+' | awk -F':' '{print $2}' | head -n1)
[ -z "$PCID" ] && PCID=$(echo "$NRCAINFO" | grep -o -E 'PCI:[0-9]+' | awk -F':' '{print $2}' | head -n1)
[ -z "$PCID" ] && PCID="--"

ARFCN=$(echo "$NR5G_INFO" | grep -i -E '^(afrcn|arfcn):' | awk -F':' '{print $2}' | tr -d ' ' | head -n1)
[ -z "$ARFCN" ] && ARFCN=$(echo "$BNRINFO" | grep -o -E 'EARFCN:[0-9]+' | awk -F':' '{print $2}' | head -n1)
[ -z "$ARFCN" ] && ARFCN=$(echo "$NRCAINFO" | grep -o -E 'EARFCN:[0-9]+' | awk -F':' '{print $2}' | head -n1)
[ -z "$ARFCN" ] && ARFCN="--"

RSRP=$(echo "$NR5G_INFO" | grep -i '^rsrp:' | awk -F':' '{print $2}' | tr -d ' ' | head -n1)
[ -z "$RSRP" ] && RSRP=$(echo "$BNRINFO" | grep -o -E 'RSRP -?[0-9]+' | awk '{print $2}' | head -n1)
[ -z "$RSRP" ] && RSRP="--"

RSRQ=$(echo "$NR5G_INFO" | grep -i '^rsrq:' | awk -F':' '{print $2}' | tr -d ' ' | head -n1)
[ -z "$RSRQ" ] && RSRQ=$(echo "$BNRINFO" | grep -o -E 'RSRQ -?[0-9]+' | awk '{print $2}' | head -n1)
[ -z "$RSRQ" ] && RSRQ="--"

SINR=$(echo "$NR5G_INFO" | grep -i '^snr:' | awk -F':' '{print $2}' | tr -d ' ' | head -n1)
[ -z "$SINR" ] && SINR=$(echo "$BNRINFO" | grep -o -E 'SINR -?[0-9]+' | awk '{print $2}' | head -n1)
[ -z "$SINR" ] && SINR="--"

BAND=$(echo "$CRI_BAND" | grep -o -E 'Band [0-9]+' | awk '{print "n"$2}' | head -n1)
[ -z "$BAND" ] && BAND=$(echo "$BNRINFO" | grep -o -E 'NR BAND:[0-9]+' | awk -F':' '{print "n"$2}' | head -n1)
[ -z "$BAND" ] && BAND=$(echo "$NRCAINFO" | grep -i 'PCC' | grep -o -E 'Band:[0-9]+' | awk -F':' '{print "n"$2}' | head -n1)
[ -z "$BAND" ] && BAND="--"

BW=$(echo "$CRI_BAND" | grep -o -E 'NR5G [0-9]+ MHz' | awk '{print $2}' | head -n1)
[ -z "$BW" ] && BW=$(echo "$BNRINFO" | grep -o -E 'DL_bandwidth:[0-9]+' | awk -F':' '{print $2}' | head -n1)
[ -z "$BW" ] && BW="--"

PLMN_MCC=$(echo "$NR5G_INFO" | grep -i '^mcc:' | awk -F':' '{print $2}' | tr -d ' ' | head -n1)
PLMN_MNC=$(echo "$NR5G_INFO" | grep -i '^mnc:' | awk -F':' '{print $2}' | tr -d ' ' | head -n1)
if [ -n "$PLMN_MCC" ] && [ -n "$PLMN_MNC" ]; then
    PLMN="${PLMN_MCC}${PLMN_MNC}"
else
    PLMN="405869"
fi

DL_MOD_NUM=$(echo "$NRCAINFO" | grep -i 'PCC' | grep -o -E 'DL_MOD:[0-9]+' | awk -F':' '{print $2}' | head -n1)
UL_MOD_NUM=$(echo "$NRCAINFO" | grep -i 'PCC' | grep -o -E 'UL_MOD:[0-9]+' | awk -F':' '{print $2}' | head -n1)

get_mod_string() {
    case "$1" in
        0) echo "QPSK" ;;
        1) echo "16QAM" ;;
        2) echo "64QAM" ;;
        3) echo "256QAM" ;;
        *) echo "--" ;;
    esac
}

DL_MOD_STR=$(get_mod_string "$DL_MOD_NUM")
UL_MOD_STR=$(get_mod_string "$UL_MOD_NUM")
[ "$DL_MOD_STR" = "--" ] && DL_MOD_STR=$(echo "$NRCAINFO" | grep -i 'PCC' | grep -o -E '(256QAM|64QAM|16QAM|QPSK)' | head -n1 || echo "--")
MOD="DL:${DL_MOD_STR} UL:${UL_MOD_STR}"

DL_MIMO_NUM=$(echo "$NRCAINFO" | grep -i 'PCC' | grep -o -E 'DL_MIMO:[0-9]+' | awk -F':' '{print $2}' | head -n1)
UL_MIMO_NUM=$(echo "$NRCAINFO" | grep -i 'PCC' | grep -o -E 'UL_MIMO:[0-9]+' | awk -F':' '{print $2}' | head -n1)

get_mimo_string() {
    case "$1" in
        0) echo "1x1" ;;
        1) echo "2x2" ;;
        2|3) echo "4x4" ;;
        *) echo "--" ;;
    esac
}

DL_MIMO_STR=$(get_mimo_string "$DL_MIMO_NUM")
[ "$DL_MIMO_STR" = "--" ] && DL_MIMO_STR=$(echo "$NRCAINFO" | grep -i 'PCC' | grep -o -E '[1-4]x[1-4]' | head -n1 || echo "--")
MIMO="${DL_MIMO_STR}"

DL_BLER_RAW=$(echo "$BNRINFO" | grep -i 'BLER' | grep -i -o -E 'DL BLER[: ]*[0-9.]+' | grep -o -E '[0-9.]+' | head -n1)
[ -z "$DL_BLER_RAW" ] && DL_BLER_RAW="--"
if [ "$DL_BLER_RAW" != "--" ]; then
    BLER_P="${DL_BLER_RAW}%"
else
    BLER_P="--"
fi

TA=$(echo "$BNRINFO" | grep -i 'TIMING' | awk -F'[: ]+' '{print $NF}' | tr -d ' \r\n')
[ -z "$TA" ] && TA="--"

DUPLEX="TDD"
STATE="CONNECTED"

SCC_LINE=$(echo "$NRCAINFO" | grep -i 'SCC 1')
if [ -n "$SCC_LINE" ] && ! echo "$SCC_LINE" | grep -q '<NA>'; then
    SCC_BAND=$(echo "$SCC_LINE" | grep -o -E 'Band:[a-zA-Z0-9]+' | awk -F':' '{print $2}')
    [ -z "$SCC_BAND" ] && SCC_BAND="--"
    SCC_BW=$(echo "$SCC_LINE" | grep -o -E '[0-9]+MHz' | tr -d 'MHz' | head -n1)
    [ -z "$SCC_BW" ] && SCC_BW="--"
    SCC_PCID=$(echo "$SCC_LINE" | grep -o -E 'PCI:[0-9]+' | awk -F':' '{print $2}' | head -n1)
    [ -z "$SCC_PCID" ] && SCC_PCID="--"
    SCC_ARFCN=$(echo "$SCC_LINE" | grep -o -E '(ARFCN|Freq)[: ]+[0-9]+' | awk '{print $2}' | head -n1)
    [ -z "$SCC_ARFCN" ] && SCC_ARFCN="--"
    SCC_RSRP=$(echo "$SCC_LINE" | grep -o -E 'RSRP[: ]+[-0-9]+' | awk '{print $2}' | head -n1)
    [ -z "$SCC_RSRP" ] && SCC_RSRP="--"
    SCC_RSRQ="--"
    SCC_SINR=$(echo "$SCC_LINE" | grep -o -E 'SINR[: ]+[-0-9]+' | awk '{print $2}' | head -n1)
    [ -z "$SCC_SINR" ] && SCC_SINR="--"
    SCC_BLER="--"
    SCC_MOD=$(echo "$SCC_LINE" | grep -o -E '(256QAM|64QAM|16QAM|QPSK)' | head -n1)
    [ -z "$SCC_MOD" ] && SCC_MOD="--"
    SCC_MIMO=$(echo "$SCC_LINE" | grep -o -E '[1-4]x[1-4]' | head -n1)
    [ -z "$SCC_MIMO" ] && SCC_MIMO="--"
else
    SCC_BAND="--"
    SCC_BW="--"
    SCC_ARFCN="--"
    SCC_PCID="--"
    SCC_RSRP="--"
    SCC_RSRQ="--"
    SCC_SINR="--"
    SCC_BLER="NA"
    SCC_MOD="NA"
    SCC_MIMO="NA"
fi

NEIGHBORS_JSON=$(printf '%s\n' "$BNRCELLH" | awk '
    BEGIN { printf "["; first=1 }
    NF==5 && $1 ~ /^[0-9]+$/ && $2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/ {
        arfcn=$2; pci=$3; rsrp=$4; rsrq=$5
        if (arfcn == "0" && pci == "0") next
        band="n78"
        if (arfcn < 200000) band="n28"
        if (arfcn > 2000000) band="n258"
        if (!first) printf ","
        printf "{\"pci\":\"%s\",\"arfcn\":\"%s\",\"rsrp\":\"%s\",\"rsrq\":\"%s\",\"band\":\"%s\"}", pci, arfcn, rsrp, rsrq, band
        first = 0
    }
    END { printf "]" }
')
[ -z "$NEIGHBORS_JSON" ] && NEIGHBORS_JSON="[]"

CPU=$(echo "$STATUS" | sed -n '/---CPU---/,/---TEMP---/p' | grep -v -e '---' | head -n1 | tr -d '\r\n')
[ -z "$CPU" ] && CPU="0"

RAW_TEMP=$(echo "$STATUS" | sed -n '/---TEMP---/,/---NET---/p' | grep -v -e '---' | head -n1 | tr -d '\r\n')
if [ -n "$RAW_TEMP" ] && [ "$RAW_TEMP" -gt 1000 ] 2>/dev/null; then
    TEMP=$((RAW_TEMP / 1000))
elif [ -n "$RAW_TEMP" ]; then
    TEMP="$RAW_TEMP"
else
    TEMP="0"
fi

NET_LINE=$(echo "$STATUS" | sed -n '/---NET---/,/---UPTIME---/p' | grep -v -e '---' | head -n1 | tr -d '\r')
RX_BYTES=$(echo "$NET_LINE" | awk '{print $1}')
TX_BYTES=$(echo "$NET_LINE" | awk '{print $2}')
[ -z "$RX_BYTES" ] && RX_BYTES="0"
[ -z "$TX_BYTES" ] && TX_BYTES="0"

UPTIME=$(echo "$STATUS" | sed -n '/---UPTIME---/,/---MODEL---/p' | grep -v -e '---' | head -n1 | tr -d '\r\n')
MODEL=$(echo "$STATUS" | sed -n '/---MODEL---/,/---VERSION---/p' | grep -v -e '---' | head -n1 | tr -d '\r\n')
[ -z "$MODEL" ] && MODEL="JODU5164x"
MODEL_ESC=$(echo "$MODEL" | sed 's/"/\\"/g')

JSON_OUT=$(printf '{"server_link":"ONLINE","state":"%s","duplex":"%s","mccmnc":"%s","band":"%s","bw":"%s","rsrp":"%s","rsrq":"%s","sinr":"%s","temp":"%s","uptime":"%s","cpu":"%s","bler":"%s","mod":"%s","mimo":"%s","pcid":"%s","arfcn":"%s","ta":"%s","scc_band":"%s","scc_bw":"%s","scc_rsrp":"%s","scc_rsrq":"%s","scc_sinr":"%s","scc_bler":"%s","scc_mod":"%s","scc_mimo":"%s","scc_pcid":"%s","scc_arfcn":"%s","rx_bytes":"%s","tx_bytes":"%s","neighbors":%s,"odu_cpu_model":"%s"}' \
  "${STATE:-CONNECTED}" "${DUPLEX}" "${PLMN}" "${BAND}" "${BW}" "${RSRP}" "${RSRQ}" "${SINR}" "${TEMP}" "${UPTIME:-0}" "${CPU}" "${BLER_P}" "${MOD}" "${MIMO}" "${PCID}" "${ARFCN}" "${TA}" "${SCC_BAND}" "${SCC_BW}" "${SCC_RSRP}" "${SCC_RSRQ}" "${SCC_SINR}" "${SCC_BLER}" "${SCC_MOD}" "${SCC_MIMO}" "${SCC_PCID}" "${SCC_ARFCN}" "${RX_BYTES}" "${TX_BYTES}" "${NEIGHBORS_JSON}" "${MODEL_ESC}")

echo "$JSON_OUT"
