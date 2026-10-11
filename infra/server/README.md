# Server สำหรับ CD (วันที่ 2)

LXD container 1 ตัวต่อนักศึกษา 1 คน มี Docker ข้างใน — GitHub Actions จะ SSH เข้ามา `docker compose pull && up -d`

| | std00 (ผู้สอนทดสอบ) … std21 |
|---|---|
| container | `stdNN` (Ubuntu 24.04 + Docker Engine + compose plugin) |
| IP ภายใน | `10.45.163.(200+N)` |
| SSH | `ssh -p 50NN student@76.13.177.240` |
| Web | `https://stdNN.cpedev.cloud` → container port **8080** |
| API | `https://api-stdNN.cpedev.cloud` → container port **3000** |
| limit | 2 CPU, 2 GiB RAM, 4000 processes (profile `student`) |

```
Internet ─▶ host nginx :80/:443 ──(map $host)──▶ 10.45.163.2NN:8080 / :3000
         └▶ host :50NN ──(LXD proxy device)──▶ stdNN :22
```

## ไฟล์

| ไฟล์ | ทำอะไร |
|---|---|
| `lxd-docker-forward.service` | Docker บน host ตั้ง FORWARD policy = drop ทำให้ LXD ออก internet ไม่ได้ — เพิ่ม rule ใน `DOCKER-USER` |
| `build-base-image.sh` | สร้าง LXD image `student-base` (Docker + user `student` + pull `postgres:18-alpine` ไว้ก่อน) |
| `create-students.sh` | สร้าง `stdNN` จาก image, ตั้ง IP/SSH port, สุ่ม password → พิมพ์ CSV |
| `gen-nginx.sh` | สร้าง `/etc/nginx/sites-available/cpedev-students` |
| `issue-cert.sh` | ขอ/ขยาย cert Let's Encrypt `students.cpedev.cloud` ให้ทุกชื่อที่ DNS ชี้มาแล้ว |

## ติดตั้ง (รันบน host ด้วย root)

```bash
cp lxd-docker-forward.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now lxd-docker-forward

bash build-base-image.sh
bash create-students.sh 0 21 > students.csv     # เก็บไฟล์นี้ไว้ ห้าม commit

bash gen-nginx.sh 0 21 > /etc/nginx/sites-available/cpedev-students
ln -s /etc/nginx/sites-available/cpedev-students /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

bash issue-cert.sh 0 21                          # หลัง DNS ชี้มาแล้ว
bash gen-nginx.sh 0 21 ssl > /etc/nginx/sites-available/cpedev-students
nginx -t && systemctl reload nginx
```

เพิ่มนักศึกษาทีหลัง: `bash create-students.sh 22 25 >> students.csv` แล้วรัน `gen-nginx.sh 0 25 ssl` และ `issue-cert.sh 0 25` ใหม่

## งานประจำ

```bash
lxc list -c ns4 | grep std                      # สถานะทุกตัว
lxc exec std05 -- su - student                  # เข้าไปช่วยนักศึกษา
lxc exec std05 -- docker ps
lxc exec std05 -- bash -c 'echo student:NEWPASS | chpasswd'   # reset password
lxc delete -f std05 && bash infra/server/create-students.sh 5 5   # ล้างทำใหม่ (ได้ password ใหม่)
```

หลังจบคอร์ส: `for n in $(seq -w 0 21); do lxc delete -f std$n; done` และลบ `/etc/nginx/sites-enabled/cpedev-students`

## ข้อควรรู้

- storage pool เป็น `dir` จึงจำกัด disk ต่อ container ไม่ได้ — ดู `df -h /` เป็นระยะ
- ทุก container ออก internet ด้วย IP เดียวกัน → Docker Hub anonymous pull มี rate limit (postgres pull ไว้ใน image แล้ว, api/web ดึงจาก GHCR)
- password ของ `student` ใช้แค่ครั้งแรก — วันที่ 2 นักศึกษาสร้าง SSH key ให้ GitHub Actions ใช้ deploy
