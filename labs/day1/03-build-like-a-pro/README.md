# Lab 3 — Build อย่างมืออาชีพ: Cache, .dockerignore, Multi-stage, Push (90 นาที)

> ใช้แอปจริงของ workshop: **`app/api`** (Express + TypeScript)
> เป้าหมาย: image เล็ก, build เร็ว, ปลอดภัย, และพร้อมขึ้น registry — ทั้งหมดนี้คือสิ่งที่ CI/CD ต้องการ

## 3.0 ลองรันแบบไม่มี Docker ก่อน (ถ้าเครื่องมี Node)

```bash
cd app/api
npm ci && npm test && npm run build && npm start
```

นี่คือขั้นตอนที่ Dockerfile ต้องทำแทนเรา

## 3.1 แบบ naive ❌

```bash
cp ../../labs/day1/03-build-like-a-pro/Dockerfile.naive Dockerfile
docker build -t todo-api:naive .
docker images todo-api
```

**ปัญหาที่ต้องหาให้เจอ (มีอย่างน้อย 5 ข้อ):**

1. `FROM node:24` (Debian เต็ม) → image > 1 GB
2. `COPY . .` ก่อน `npm install` → แก้โค้ด 1 บรรทัด ต้องติดตั้ง package ใหม่ทั้งหมด
3. ไม่มี `.dockerignore` → `node_modules` ของเครื่องเรา (ซึ่งอาจเป็นของ Windows) ถูก copy เข้าไป
4. devDependencies (typescript, vitest) และ source code ติดไปใน image ที่ใช้รันจริง
5. รันด้วย user `root`  → ลอง `docker run --rm todo-api:naive whoami`

## 3.2 Layer cache ทำงานอย่างไร

```bash
docker build -t todo-api:naive .      # รันซ้ำ → ทุก step ขึ้น CACHED
# แก้ข้อความใน src/server.ts สักนิด แล้ว build ใหม่
docker build -t todo-api:naive .      # npm install รันใหม่ทั้งที่ package ไม่เปลี่ยน!
```

> **กฎ:** เมื่อ layer ไหนเปลี่ยน ทุก layer หลังจากนั้นจะ build ใหม่หมด
> → วางสิ่งที่เปลี่ยนน้อย (dependencies) ไว้บน, สิ่งที่เปลี่ยนบ่อย (source) ไว้ล่าง

## 3.3 แบบมืออาชีพ ✅

```bash
cp ../../labs/day1/03-build-like-a-pro/Dockerfile Dockerfile
cp ../../labs/day1/03-build-like-a-pro/.dockerignore .dockerignore
docker build -t todo-api:1.0 .
docker images todo-api                # เทียบขนาด naive vs 1.0
```

อ่าน `Dockerfile` ทีละ stage:

| Stage | ทำอะไร | ไปอยู่ใน image สุดท้ายไหม |
|---|---|---|
| `deps` | `npm ci` (ทุก package) | ❌ |
| `build` | `tsc` → `dist/` | ❌ (เอามาแค่ `dist/`) |
| `runtime` | `npm ci --omit=dev` + `dist/` + `USER node` | ✅ |

ลองแก้ `src/server.ts` แล้ว build ใหม่ → สังเกตว่า `npm ci` ขึ้น **CACHED**

## 3.4 รันและตรวจสอบ

```bash
docker run -d --name api -p 3000:3000 todo-api:1.0
curl http://localhost:3000/api/info
curl -X POST http://localhost:3000/api/todos -H "Content-Type: application/json" -d '{"title":"learn docker"}'
curl http://localhost:3000/api/todos

docker exec api whoami                # node (ไม่ใช่ root)
docker ps                             # STATUS มี (healthy) จาก HEALTHCHECK
docker stop api && docker logs api    # เห็น "SIGTERM received" = graceful shutdown
```

> PowerShell: ใช้ `curl.exe` แทน `curl` และ escape JSON เป็น `'{\"title\":\"learn docker\"}'`
> หรือเปิด http://localhost:3000/api/todos ใน browser แทน

## 3.5 Tag & Push ขึ้น Docker Hub

```bash
docker login                                      # ใช้บัญชี Docker Hub ของตัวเอง
docker tag todo-api:1.0 <dockerhub-user>/todo-api:1.0
docker push <dockerhub-user>/todo-api:1.0

# ให้เพื่อนข้าง ๆ ลอง pull ของเรามารัน
docker run -d -p 3001:3000 <เพื่อน>/todo-api:1.0
```

**เรื่อง tag ที่ต้องรู้ก่อนไป CI/CD:**

- `latest` ไม่ได้แปลว่า "ล่าสุด" — เป็นแค่ชื่อ tag default ที่ใครจะเขียนทับเมื่อไรก็ได้
- ใน production ใช้ tag ที่ **ไม่เปลี่ยน**: `1.0.3` (semver) หรือ `a1b2c3d` (git commit SHA)
- พรุ่งนี้ GitHub Actions จะ tag image ด้วย commit SHA ให้อัตโนมัติ

## ✅ Challenge

1. `docker history todo-api:1.0` vs `todo-api:naive` — layer ไหนใหญ่ที่สุด?
2. ลองลบ `.dockerignore` แล้ว build ใหม่ สังเกตบรรทัด `transferring context` ว่าใหญ่ขึ้นเท่าไร
3. เพิ่ม stage `test` ระหว่าง `build` กับ `runtime` ที่รัน `npm test` แล้ว build ด้วย `--target test`
