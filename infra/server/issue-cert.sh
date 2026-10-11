#!/usr/bin/env bash
# ขอ/ขยาย cert "students.cpedev.cloud" ให้ครอบคลุมทุกชื่อ stdNN ที่ DNS ชี้มาที่ server นี้แล้ว
# ใช้: bash issue-cert.sh 0 21   (รันซ้ำได้ เช่นหลังเพิ่มนักศึกษา)
set -euo pipefail
FIRST=${1:-0}
LAST=${2:-21}
SERVER_IP=$(curl -s -4 https://ifconfig.me)

args=()
for n in $(seq "$FIRST" "$LAST"); do
  h=$(printf "std%02d" "$n")
  if [ "$(dig +short "$h.cpedev.cloud" @1.1.1.1 | tail -1)" = "$SERVER_IP" ]; then
    args+=(-d "$h.cpedev.cloud")
  else
    echo "skip $h.cpedev.cloud (DNS ยังไม่ชี้มาที่ $SERVER_IP)" >&2
  fi
done

certbot certonly --nginx --non-interactive --expand \
  --cert-name students.cpedev.cloud "${args[@]}" \
  --deploy-hook "systemctl reload nginx"
