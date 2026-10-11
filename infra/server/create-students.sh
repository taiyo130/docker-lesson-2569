#!/usr/bin/env bash
# สร้าง container std00..stdNN จาก image student-base
#   IP   10.45.163.(200+N)   SSH  host:(5000+N) -> container:22
# ใช้: bash create-students.sh 0 21 > passwords.csv
# รันซ้ำได้: container ที่มีอยู่แล้วจะถูกข้าม
set -euo pipefail
FIRST=${1:-0}
LAST=${2:-21}

if ! lxc profile show student >/dev/null 2>&1; then
  lxc profile create student
  lxc profile set student security.nesting=true
  lxc profile set student limits.cpu=2
  lxc profile set student limits.memory=2GiB
  lxc profile set student limits.processes=4000
  lxc profile set student boot.autostart=true
fi

echo "name,ssh,password,web,api"
for n in $(seq "$FIRST" "$LAST"); do
  name=$(printf "std%02d" "$n")
  ip="10.45.163.$((200 + n))"
  port=$((5000 + n))
  if lxc info "$name" >/dev/null 2>&1; then
    echo "skip $name (exists)" >&2
    continue
  fi
  lxc init student-base "$name" -p default -p student >&2
  lxc config device override "$name" eth0 ipv4.address="$ip"  >&2
  lxc config device add "$name" ssh proxy listen="tcp:0.0.0.0:$port" connect="tcp:127.0.0.1:22" >&2
  lxc start "$name" >&2
  until lxc exec "$name" -- systemctl is-system-running --wait >/dev/null 2>&1 \
     || lxc exec "$name" -- test -s /etc/machine-id; do sleep 1; done
  pass=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-12)
  lxc exec "$name" -- bash -ec "
    ssh-keygen -A >/dev/null
    systemctl restart ssh
    echo 'student:$pass' | chpasswd
  "
  echo "$name,ssh -p $port student@76.13.177.240,$pass,https://$name.cpedev.cloud,https://api-$name.cpedev.cloud"
done
