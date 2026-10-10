# Lab 2 — Dockerfile แรก (75 นาที)

> เป้าหมาย: เขียน Dockerfile → build → run → เข้าใจคำสั่งหลักแต่ละตัว

## 2.1 ดูไฟล์ในโฟลเดอร์นี้

- `server.js` — web server จิ๋ว ใช้แค่ `node:http` (ไม่มี dependency)
- `Dockerfile` — มีคอมเมนต์อธิบายทุกบรรทัด

## 2.2 Build & Run

```bash
cd labs/day1/02-first-dockerfile
docker build -t hello-node:1.0 .
#             └─ ชื่อ:tag      └─ build context (โฟลเดอร์ที่ส่งให้ Docker)

docker run -d --name hello -p 3000:3000 hello-node:1.0
curl http://localhost:3000        # หรือเปิดใน browser
```

## 2.3 ENV — config จากภายนอก

```bash
docker rm -f hello
docker run -d --name hello -p 3000:3000 -e STUDENT_NAME="ชื่อของคุณ" hello-node:1.0
curl http://localhost:3000

# เปลี่ยน port ข้างในด้วย
docker run -d --name hello2 -p 4000:5000 -e PORT=5000 hello-node:1.0
curl http://localhost:4000
```

❓ ใน `-p 4000:5000` ตัวไหนเป็นของเครื่องเรา ตัวไหนเป็นของ container?

## 2.4 ดูว่า image ประกอบด้วยอะไร

```bash
docker history hello-node:1.0     # แต่ละบรรทัดคือ 1 layer
docker image inspect hello-node:1.0 -f '{{.Config.Cmd}} {{.Config.Env}}'
```

## 2.5 CMD vs ENTRYPOINT

```bash
# CMD ถูกแทนที่ได้ทั้งหมดด้วย argument ท้ายคำสั่ง
docker run --rm hello-node:1.0 node -e "console.log('override CMD')"
docker run --rm hello-node:1.0 node --version
```

| | `CMD` | `ENTRYPOINT` |
|---|---|---|
| ถูกแทนที่ด้วย `docker run IMAGE xxx` | ✅ แทนทั้งหมด | ❌ (xxx ต่อท้ายเป็น argument) |
| ใช้เมื่อ | คำสั่ง default ของแอป | ทำ image ให้เป็น "คำสั่ง" เช่น `ENTRYPOINT ["curl"]` |

> ใช้ **exec form** `["node", "server.js"]` เสมอ — shell form `node server.js` จะรันผ่าน `/bin/sh -c`
> ทำให้แอปไม่ได้รับ SIGTERM ตอน `docker stop`

## ✅ Challenge

1. แก้ข้อความใน `server.js` → ต้องทำอะไรบ้างถึงจะเห็นผล? (คำตอบ: build ใหม่ + run ใหม่)
2. Build เป็น tag `1.1` แล้วรันทั้ง `1.0` และ `1.1` พร้อมกันคนละ port
3. เขียน Dockerfile ชื่อ `Dockerfile.curl` ที่ `FROM alpine:3`, ติดตั้ง curl, และ `ENTRYPOINT ["curl", "-s"]`
   แล้วลอง `docker build -f Dockerfile.curl -t mycurl . && docker run --rm mycurl https://example.com`
