#!/bin/sh

for pid in $(pgrep -f jodu5164x-setup.sh 2>/dev/null); do
    [ "$pid" != "$$" ] && kill -9 $pid 2>/dev/null
done
killall -9 nc 2>/dev/null

touch /tmp/odu5164x_setup.lock
trap 'rm -f /tmp/odu5164x_setup.lock' EXIT INT TERM

IP=$(/sbin/uci -q get jodu5164x.main.ip)
[ -z "$IP" ] && IP=$(/sbin/uci -q get jodu5164x.main.host)
[ -z "$IP" ] && IP="192.168.225.1"
USER=$(/sbin/uci -q get jodu5164x.main.user)
[ -z "$USER" ] && USER=$(/sbin/uci -q get jodu5164x.main.telnet_username)
PASS=$(/sbin/uci -q get jodu5164x.main.pass)
[ -z "$PASS" ] && PASS=$(/sbin/uci -q get jodu5164x.main.telnet_password)

NR_ARFCN=$(/sbin/uci -q get jodu5164x.main.arfcn)
NR_PCI=$(/sbin/uci -q get jodu5164x.main.pci)

(
if [ -n "$PASS" ]; then
    sleep 2
    printf '%s\r\n' "$PASS"
    sleep 2
else
    sleep 1
    printf '\r\n'
    sleep 1
fi

if [ -n "$NR_ARFCN" ] && [ -n "$NR_PCI" ]; then
    printf 'cricli set_nr5g_cell_config 0 %s %s 1 0 8192 0 0 0 0 0 0\r\n' "$NR_PCI" "$NR_ARFCN"
    sleep 2
fi

echo "kill -9 \$(cat /tmp/odu_monitor.pid 2>/dev/null) 2>/dev/null"
echo "killall -9 odu_monitor.sh 2>/dev/null"
echo "pkill -9 -f odu_monitor 2>/dev/null"
echo "killall -9 httpd 2>/dev/null"
echo "rm -f /tmp/odu_monitor.pid"
sleep 1

echo "cat << 'EOF' > /tmp/odu_monitor.sh"
echo "#!/bin/sh"
echo "trap '' HUP"
echo "echo \$\$ > /tmp/odu_monitor.pid"
echo "mkdir -p /tmp/www"
echo ""
echo "("
echo "    while true; do"
echo "        [ -x /usr/bin/atcli ] && NRINFO=\$(timeout 5 /usr/bin/atcli \"AT+BNRINFO\" 2>/dev/null)"
echo "        sleep 0.2"
echo "        [ -x /usr/bin/atcli ] && NRCAINFO=\$(timeout 5 /usr/bin/atcli \"AT+NRCAINFO\" 2>/dev/null)"
echo "        sleep 0.2"
echo "        [ -x /usr/bin/atcli ] && NRCELLH=\$(timeout 5 /usr/bin/atcli \"AT+BNRCELLH\" 2>/dev/null)"
echo "        {"
echo "            echo \"---BNRINFO---\""
echo "            echo \"\$NRINFO\""
echo "            echo \"---NRCAINFO---\""
echo "            echo \"\$NRCAINFO\""
echo "            echo \"---BNRCELLH---\""
echo "            echo \"\$NRCELLH\""
echo "        } > /tmp/www/status.slow.tmp"
echo "        mv /tmp/www/status.slow.tmp /tmp/www/status.slow"
echo "        sleep 10"
echo "    done"
echo ") &"
echo "echo \$! >> /tmp/odu_monitor.pid"
echo ""
echo "("
echo "    while true; do"
echo "        CRI_CELL=\"\""
echo "        command -v cricli >/dev/null 2>&1 && CRI_CELL=\$(timeout 2 cricli cell_location 2>/dev/null)"
echo "        CRI_BAND=\"\""
echo "        command -v cricli >/dev/null 2>&1 && CRI_BAND=\$(timeout 2 cricli band 2>/dev/null)"
echo "        NET_BYTES=\$(timeout 3 cricli wwan_stats 2>/dev/null | grep -i 'IPV4' | head -n1 | sed -n 's/.*bytes: ( \\([0-9]*\\) \\/ \\([0-9]*\\) ).*/\\2 \\1/p')"
echo "        [ -z \"\$NET_BYTES\" ] && NET_BYTES=\"\$(cat /sys/class/net/rmnet_data0/statistics/rx_bytes 2>/dev/null || echo \"0\") \$(cat /sys/class/net/rmnet_data0/statistics/tx_bytes 2>/dev/null || echo \"0\")\""
echo "        if ! pidof httpd > /dev/null; then"
echo "            httpd -p 8080 -h /tmp/www"
echo "        fi"
echo "        read p_total p_idle < /tmp/odu_cpu_stat 2>/dev/null"
echo "        CPU=\$(awk -v pt=\"\${p_total:-0}\" -v pi=\"\${p_idle:-0}\" '/^cpu / { t=\$2+\$3+\$4+\$5+\$6+\$7+\$8+\$9; i=\$5; dt=t-pt; di=i-pi; if(pt>0 && dt>0) print int(100*(dt-di)/dt); else print \"0\"; print t\" \"i > \"/tmp/odu_cpu_stat\"; exit }' /proc/stat)"
echo "        TEMP=\$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo \"0\")"
echo "        {"
echo "            cat /tmp/www/status.slow 2>/dev/null"
echo "            echo \"---CRI_CELL---\""
echo "            echo \"\$CRI_CELL\""
echo "            echo \"---CRI_BAND---\""
echo "            echo \"\$CRI_BAND\""
echo "            echo \"---NET---\""
echo "            echo \"\$NET_BYTES\""
echo "            echo \"---CPU---\""
echo "            echo \"\${CPU:-0}\""
echo "            echo \"---TEMP---\""
echo "            echo \"\$TEMP\""
echo "            echo \"---UPTIME---\""
echo "            cat /proc/uptime"
echo "            echo \"---MODEL---\""
echo "            if [ -f /usr/etc/versions/product_name ]; then cat /usr/etc/versions/product_name 2>/dev/null; else cat /proc/device-tree/model 2>/dev/null || echo \"JODU5164x\"; fi"
echo "            echo \"---VERSION---\""
echo "            echo \"5164x-1.0.0-r3\""
echo "        } > /tmp/www/status.tmp"
echo "        mv /tmp/www/status.tmp /tmp/www/status.txt"
echo "        sleep 2"
echo "    done"
echo ") &"
echo "echo \$! >> /tmp/odu_monitor.pid"
echo ""
echo "wait"
echo "EOF"
sleep 1

echo "chmod +x /tmp/odu_monitor.sh"
sleep 1
echo "( /tmp/odu_monitor.sh </dev/null >/dev/null 2>&1 & ) &"
sleep 1
echo "exit"
sleep 1
) | nc "$IP" 23 > /tmp/odu5164x_setup.log 2>&1 &

TELNET_PID=$!
sleep 25
kill -9 $TELNET_PID 2>/dev/null
killall -9 nc 2>/dev/null
