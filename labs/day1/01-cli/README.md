# Lab 1 — Docker CLI & Container Lifecycle (45 นาที)

> เป้าหมาย: รัน / ดู / เข้าไปข้างใน / หยุด / ลบ container ได้คล่อง

## 1.1 ตรวจว่าเครื่องพร้อม

```bash
docker version          # ต้องเห็นทั้ง Client และ Server
docker run hello-world
```

ถ้าเห็น `Hello from Docker!` แปลว่า Client → Daemon → Registry ทำงานครบ

## 1.2 Image กับ Container

```bash
docker pull nginx:1.29-alpine      # ดึง image จาก Docker Hub
docker images                      # image ที่มีในเครื่อง
docker run -d --name web -p 8080:80 nginx:1.29-alpine
docker ps                          # container ที่กำลังรัน
```

เปิด <http://localhost:8080> → ต้องเห็นหน้า Welcome to nginx

| flag | ความหมาย |
|---|---|
| `-d` | detached — รันเบื้องหลัง คืน terminal ให้เรา |
| `--name web` | ตั้งชื่อ (ไม่งั้น Docker สุ่มชื่อให้) |
| `-p 8080:80` | `port เครื่องเรา : port ใน container` |

## 1.3 ดูข้างใน container

```bash
docker logs web            # log ที่ออก stdout/stderr
docker logs -f web         # ตามดูแบบ real-time (Ctrl+C เพื่อออก)
docker exec -it web sh     # เปิด shell ใน container ที่รันอยู่
#   ใน container ลอง: cat /etc/os-release ; ps ; ls /usr/share/nginx/html ; exit
docker inspect web         # ข้อมูลทั้งหมดเป็น JSON
docker inspect -f '{{.NetworkSettings.IPAddress}}' web
docker stats --no-stream   # CPU / RAM ที่ใช้
```

## 1.4 Interactive mode

```bash
docker run -it --rm alpine:3 sh
#   ลอง: apk add curl ; curl -I https://www.google.com ; exit
docker run -it --rm alpine:3 sh -c "which curl || echo 'curl หายไปแล้ว!'"
```

❓ **คำถาม:** ทำไม `curl` ที่ติดตั้งไว้หายไป → container แต่ละตัวเริ่มจาก image เดิมเสมอ
(`--rm` = ลบ container ทิ้งทันทีเมื่อออก)

## 1.5 Lifecycle

```bash
docker stop web      # ส่ง SIGTERM → รอ 10 วิ → SIGKILL
docker ps            # ไม่เห็นแล้ว
docker ps -a         # เห็น (สถานะ Exited)
docker start web     # กลับมารันได้
docker rm -f web     # หยุด + ลบ
docker rmi nginx:1.29-alpine
```

```
 docker create/run ──▶ [Created] ──start──▶ [Running] ──stop──▶ [Exited] ──rm──▶ (หายไป)
                                             ▲    │
                                             └────┘ restart
```

## ✅ Challenge (5 นาที)

1. รัน `nginx` 3 ตัวพร้อมกันที่ port 8081, 8082, 8083
2. ลองรันตัวที่ 4 ที่ port 8081 ซ้ำ → อ่าน error แล้วอธิบาย
3. ลบทั้งหมดด้วยคำสั่งเดียว: `docker rm -f $(docker ps -aq)`  (PowerShell ก็ใช้ได้)

## 🧹 ทำความสะอาด

```bash
docker system df       # ดูว่า Docker ใช้พื้นที่เท่าไร
docker system prune    # ลบ container ที่หยุดแล้ว, network ที่ไม่ใช้, dangling image
```
