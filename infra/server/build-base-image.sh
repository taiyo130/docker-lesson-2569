#!/usr/bin/env bash
# สร้าง LXD image "student-base": Ubuntu 24.04 + Docker Engine + compose plugin + user student
# รันบน host: bash build-base-image.sh
set -euo pipefail

TMP=student-base-build
lxc delete -f "$TMP" 2>/dev/null || true
lxc launch ubuntu:24.04 "$TMP" -c security.nesting=true
lxc exec "$TMP" -- cloud-init status --wait >/dev/null

lxc exec "$TMP" -- bash -euxc '
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl openssh-server git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
echo "{\"log-driver\":\"json-file\",\"log-opts\":{\"max-size\":\"10m\",\"max-file\":\"3\"}}" > /etc/docker/daemon.json
systemctl restart docker

useradd -m -s /bin/bash -G docker,sudo student
# ไฟล์ 10- ถูกอ่านก่อน 60-cloudimg-settings.conf (ค่าแรกที่เจอชนะ)
printf "PasswordAuthentication yes\nKbdInteractiveAuthentication no\nPermitRootLogin no\n" \
  > /etc/ssh/sshd_config.d/10-students.conf

# pull ไว้ก่อน ลดการโดน Docker Hub rate limit (ทุก container ออก IP เดียวกัน)
docker pull postgres:18-alpine

# ล้างค่าที่ต้องไม่ซ้ำกันในแต่ละ container
apt-get clean
systemctl stop docker docker.socket
rm -f /var/lib/docker/engine-id /etc/ssh/ssh_host_*
truncate -s 0 /etc/machine-id
'

lxc stop "$TMP"
lxc image delete student-base 2>/dev/null || true
lxc publish "$TMP" --alias student-base description="Ubuntu 24.04 + Docker (cpedev student)"
lxc delete "$TMP"
lxc image list student-base
